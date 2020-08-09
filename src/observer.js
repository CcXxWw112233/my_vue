class Watcher {
    constructor (vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        this.oldVal = this.getOldVal()
    }
    getOldVal() {
        Dep.target = this
        const oldValue = compileUtil.getValue(this.expr, this.vm)
        Dep.target = null
        return oldValue
    }
    update() {
        const newVal = compileUtil.getValue(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}

class Dep {
    constructor () {
        this.subs = []
    }
    //收集观察者
    addSub(watcher) {
        this.subs.push(watcher)
    }
    //通知观察者去更新
    notify() {
        console.log('通知了观察者', this.subs)
        this.subs.forEach(w => {
            w.update()
        })
    }
}

class Observer {
    constructor (data) {
        this.observer(data)
    }
    observer(data) { // 观察实例中的data
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }
    defineReactive(obj, key, value) {
        // // 递归劫持
        this.observer(value)
        const dep = new Dep()
        Object.defineProperty(obj, key, {
            enumerable: true,
            configurable: false,
            get() {
                // 订阅数据变化时，往Dep中添加观察者
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                this.observer(newVal) //当直接设置 vm.$data.person = {a:1},即为某个key直接赋值一个对象导致劫持不到
                if (newVal !== value) {
                    value = newVal
                }
                // 告诉Dep通知变化
                dep.notify()
            },
        })
    }
}