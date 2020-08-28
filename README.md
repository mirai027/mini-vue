# mini-vue

实现一个简单的 Vue.js。用于理解 Vue响应式原理，妈妈再也不用担心我不会用 Vue了！

> 技术尚未成熟，只实现小部分功能。 --2020/08/27
> 
> 技术实现参考[拉勾教育「大前端高薪训练营」3天体验课](https://kaiwu.lagou.com/xunlianying/index.html?courseId=25#/course?weekId=1189)

## 完整版Vue响应式原理

> 图片引自 [孟思行 - 图解 Vue 响应式原理](https://juejin.im/post/6857669921166491662)

![完整版Vue响应式原理](https://s1.ax1x.com/2020/08/23/dBGXPH.png)

## 乞丐版 mini-vue

实现`mini-vue`之前，先看看官网的描述。在`Vue`官网，[深入响应式原理](https://cn.vuejs.org/v2/guide/reactivity.html)中，是这样说明的：

> 每个组件实例都对应一个 **watcher** 实例，它会在组件渲染的过程中把“接触”过的数据 property 记录为依赖。之后当依赖项的 setter 触发时，会通知 watcher，从而使它关联的组件重新渲染。

![](https://cn.vuejs.org/images/data.png)

### 起步

> 技术原因，这里不做`Virtual DOM`、`render`部分，而选择直接操作`DOM`

简单来说，`mini vue`在创建`Vue`实例时

1. `Vue`类负责把`data`中的属性注入到`Vue`实例，并调用`Observer`类和`Compiler`类。
2. `Observer`类负责数据劫持，把每一个`data`转换成`getter`和`setter`。其核心原理是通过`Object.defineProperty`实现。
3. `Compiler`类负责解析指令和插值表达式（更新视图的方法）。
4. `Dep`类负责收集依赖、添加观察者模式。通知`data`对应的所有观察者`Watcher`来更新视图。在`Observer`类把每一个`data`转换成`getter`和`setter`时，会创建一个`Dep`实例，用来**负责收集依赖并发送通知**。在每一个`data`中在`getter`中收集依赖。在`setter`中通知依赖，既通知所有`Watcher`实例新视图。
5. `Watcher`类负责数据更新后，使关联视图重新渲染。

![乞丐版Vue](https://s1.ax1x.com/2020/08/27/d4PQMt.jpg)

**实现代码都添加了详细的注释，无毒无害，可放心查看**



### Vue类

```js
class Vue {
  constructor(options) {
    // 1. 保存 options的数据
    this.$options = options || {}
    this.$data = options.data || {}
    this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el
    // 2. 为方便调用（vm.msg），把 data中的成员转换成 getter和 setter，并注入到 Vue实例中
    this._proxyData(this.$data)
    // 3. 调用 Observer类，监听数据的变化
    new Observer(this.$data)
    // 4. 调用 compiler类，解析指令和插值表达式
    new Compiler(this)
  }
  _proxyData(data) {
    Object.keys(data).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        get() {
          return data[key]
        },
        set(newValue) {
          if (newValue === data[key]) {
            return
          }
          data[key] = newValue
        }
      })
    })
  }
}
```



### Observer类

```js
class Observer {
  constructor(data) {
    this.walk(data)
  }
  // 遍历 data($data)中的属性，把属性转换成响应式数据
  walk(data) {
    if (!data || typeof data !== 'object') {
      return
    }
    Object.keys(data).forEach((key) => {
      this.defineReactive(data, key, data[key])
    })
  }
  // 定义响应式数据
  defineReactive(obj, key, value) {
    const that = this
    // 负责收集依赖并发送通知
    let dep = new Dep()
    // 利用递归使深层（内部）属性转换成响应式数据
    this.walk(value)
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get() {
        // 收集依赖
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set(newValue) {
        if (value === newValue) {
          return
        }
        value = newValue
        // 如果新设置的值为对象，也转换成响应式数据
        that.walk(newValue)
        // 发送通知
        dep.notify()
      }
    })
  }
}
```



### Compiler类

```js
class Compiler {
  constructor(vm) {
    this.vm = vm
    this.el = vm.$el
    this.compiler(this.el)
  }

  // 编译模板，处理文本节点和元素节点
  compiler(el) {
    const childNodes = el.childNodes
    Array.from(childNodes).forEach(node => {
      // 处理文本节点
      if (this.isTextNode(node)) {
        this.compilerText(node)
      } else if (this.isElementNode(node)) {
        // 处理元素节点
        this.compilerElement(node)
      }

      // 判断 node节点是否有子节点。如果有，递归调用 compile
      if (node.childNodes.length) {
        this.compiler(node)
      }
    })
  }

  // 编译元素节点，处理指令
  compilerElement(node) {
    // 遍历所有属性节点
    Array.from(node.attributes).forEach(attr => {
      // 判断是否 v-开头指令
      let attrName = attr.name
      if (this.isDirective(attrName)) {
        // 为了更优雅的处理不同方法，减去指令中的 v-
        attrName = attrName.substr(2)
        const key = attr.value
        this.update(node, key, attrName)
      }
    })
  }

  // 执行对应指令的方法
  update(node, key, attrName) {
    let updateFn = this[attrName + 'Updater']
    // 存在指令才执行对应方法
    updateFn && updateFn.call(this, node, this.vm[key], key)
  }

  // 处理 v-text指令
  textUpdater(node, value, key) {
    node.textContent = value

    // 创建 Watcher对象，当数据改变时更新视图
    new Watcher(this.vm, key, (newValue) => {
      node.textContent = newValue
    })
  }

  // 处理 v-model指令
  modelUpdater(node, value, key) {
    node.value = value

    // 创建 Watcher对象，当数据改变时更新视图
    new Watcher(this.vm, key, (newValue) => {
      node.value = newValue
    })

    // 双向绑定
    node.addEventListener('input', () => {
      this.vm[key] = node.value
    })
  }

  // 编译文本节点，处理插值表达式
  compilerText(node) {
    const reg = /\{\{(.+?)\}\}/
    let value = node.textContent
    if (reg.test(value)) {
      // 只考虑一层的对象，如 data.msg = 'hello world'，不考虑嵌套的对象。且假设只有一个插值表达式。
      const key = RegExp.$1.trim()
      node.textContent = value.replace(reg, this.vm[key])

      // 创建 Watcher对象，当数据改变时更新视图
      new Watcher(this.vm, key, (newValue) => {
        node.textContent = newValue
      })
    }
  }

  // 判断元素属性是否属于指令
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }

  // 判断节点是否属于文本节点
  isTextNode(node) {
    return node.nodeType === 3
  }

  // 判断节点书否属于元素节点
  isElementNode(node) {
    return node.nodeType === 1
  }
}
```



### Dep类

```js
class Dep {
  constructor() {
    this.subs = []
  }
  // 添加观察者
  addSub(sub) {
    if (sub && sub.update) {
      this.subs.push(sub)
    }
  }
  // 发送通知
  notify() {
    this.subs.forEach(sub => {
      sub.update()
    })
  }
}
```





### Watcher类

```js
class Watcher {
  constructor(vm, key, cb) {
    this.vm = vm

    // data中的属性名
    this.key = key

    // 回调函数负责更新视图
    this.cb = cb

    // 把 watcher对象记录到 Dep类的静态属性 target中
    Dep.target = this
    // 触发 get方法，在 get方法中会调用 addSub
    this.oldValue = vm[key]
    Dep.target = null
  }

  // 当数据发生变化的时候更新视图
  update() {
    const newValue = this.vm[this.key]
    // 数据没有发生变化直接返回
    if (this.oldValue === newValue) {
      return
    }
    // 更新视图
    this.cb(newValue)
  }

}
```



### 最后

#### 完整版思维导图

![mini-vue](https://s1.ax1x.com/2020/08/27/d59NaF.png)

#### DEMO仓库地址

[https://github.com/mirai027/mini-vue](https://github.com/mirai027/mini-vue)

#### 对于数组的监听

这里直接把数组的每一项都添加上了`getter`和`setter`，所以`vm.items[1] = 'x'`也是响应式的。

`Vue`中为什么没这样做呢？参考 [为什么vue没有提供对数组属性的监听](https://github.com/vuejs/vue/issues/8562)

![Issues #8562](https://s1.ax1x.com/2020/08/28/dIlEo4.jpg)