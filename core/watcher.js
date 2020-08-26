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