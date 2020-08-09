const compileUtil = {
    getValue(expr, vm) { //兼容person.name
        return expr.split('.').reduce((data, curentVal) => {
            return data[curentVal]
        }, vm.$data)
    },
    getContentVal(expr, vm) {
        return expr.replace(/\{\{(.+?)\}\}/, (...args) => {
            //这是一个正则match {{person.name}} => person.name 这是args[1]
            return this.getValue(args[1], vm)
        })
    },
    text(node, expr, vm) {
        let value;
        if (/\{\{(.+?)\}\}/.test(expr)) { //字符转模板编译
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                // 绑定watcher
                new Watcher(vm, args[1], (newVal) => {
                    this.updater.textUpdater(node, this.getContentVal(expr, vm))
                })
                //这是一个正则match {{person.name}} => person.name 这是args[1]
                return this.getValue(args[1], vm)
            })
        } else {
            value = this.getValue(expr, vm)
        }
        this.updater.textUpdater(node, value)
    },
    html(node, expr, vm) {
        const value = this.getValue(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdater(node, newVal)
        })
        this.updater.htmlUpdater(node, value)
    },
    model(node, expr, vm) {
        const value = this.getValue(expr, vm)
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdater(node, newVal)
        })
        this.updater.modelUpdater(node, value)
    },
    on(node, expr, vm, eventName) {
        const fn = vm.$options.methods && vm.$options.methods[expr]
        node.addEventListener(eventName, fn.bind(vm), false)
    },
    bind(node, expr, vm, eventName) {
        const value = this.getValue(expr, vm)
        node.setAttribute(eventName, value)
    },
    updater: {
        textUpdater(node, value) {
            node.textContent = value
        },
        htmlUpdater(node, value) {
            node.innerHTML = value
        },
        modelUpdater(node, value) {
            node.value = value
        }
    }

}
class Compile {
    constructor (el, vm) { //el:挂载dom vm:当前实例
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm
        // 获取文档碎片, 保存进内存中减少页面回流和重绘， 大量dom操作的时候
        const fragment = this.node2Fragment(this.el)

        // 编译模板
        this.compile(fragment)
        // 追加子元素到根元素上
        this.el.appendChild(fragment)
    }
    compile(fragment) {
        const [...childNodes] = fragment.childNodes
        childNodes.forEach(child => {
            if (this.isElementNode(child)) { //元素节点
                this.compileElement(child)
            } else { //文本节点
                this.compileText(child)
            }
            // 递归编译子节点
            if (child.childNodes && child.childNodes.length) {
                this.compile(child)
            }
        })
    }

    // 是否一个事件
    isEventName(atrrName) {
        return atrrName.startsWith('@')
    }

    // 是否一个指令
    isDirective(name) {
        return /^v-\w+/.test(name)
    }
    // 解析节点
    compileElement(node) {
        const [...attributes] = node.attributes
        attributes.forEach(attr => {
            const { name, value } = attr
            if (this.isDirective(name)) { //是一个指令 
                const [, directive] = name.split('-')  // v-text v-html v-model等
                const [dirName, eventName] = directive.split(':'); //v-on:click v-bind:src
                //更新数据，数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName)
                // 删除指令属性
                node.removeAttribute(name)
            } else if (this.isEventName(name)) { // @click='fn'处理
                let [, eventName] = name.split('@');
                compileUtil['on'](node, value, this.vm, eventName)
            }

        })
    }
    // 解析文本
    compileText(node) {
        const content = node.textContent
        if (/\{\{(.+?)\}\}/.test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
        // console.log(node)
    }

    // 节点转化为文档对象
    node2Fragment(el) {
        const f = document.createDocumentFragment()
        let firstChild
        while (firstChild = el.firstChild) {
            f.appendChild(firstChild)
        }
        return f
    }
    // 是否节点类型
    isElementNode(node) {
        return node.nodeType === 1
    }
}

class MVue {
    constructor (options = {}) {
        const { el, data } = options
        this.$el = el
        this.$data = data
        this.$options = options
        if (this.$el) {
            //实现一个观察者
            new Observer(this.$data)
            //实现一个解析器
            new Compile(this.$el, this)
        }
    }
}