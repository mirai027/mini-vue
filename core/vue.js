class Vue {
  constructor(options) {
    // 1. 保持 options的数据
    this.$options = options || {}
    this.$data = options.data || {}
    this.$el = typeof options.el === 'string' ? document.querySelector(options.el) : options.el
    // 2. 为方便调用（vm.msg），把 data中的成员转换成 getter和 setter，并注入到 Vue实例中
    this._proxyData(this.$data)
    // 3. 调用 Observer类，监听数据的变化
    new Observer(this.$data)
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