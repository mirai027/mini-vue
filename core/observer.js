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