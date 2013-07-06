<a href="http://ufologist.github.io/mobile-fixed-columns-table">mobile-fixed-columns-table</a>
====================
在移动平台上(Android/iOS...)可用的固定列/表头的表格组件

v1.0 2013-07-04

<img src="inspiration/img/preview-mobile.png" height="504" width="897" alt="Android 2.3.x/Android 4.x/iOS上组件的运行效果截图" />

<img src="inspiration/img/preview-pc-browser.jpg" height="387" width="523" alt="PC浏览器上组件的运行效果截图" />

测试过的手机
--------------------
* S5660        -- Android 2.3.4
* Note2(N7100) -- Android 4.1.1 / Android 4.1.2
* 小米1        -- Android 4.1.2
* GT-I8552     -- Android 4.1.2
* iPhone5      -- iOS 6.1.3

<a href="https://github.com/ufologist/mobile-fixed-columns-table/tree/android-demo">Android App Demo</a>
--------------------
基于phonegap来使用mobile-fixed-columns-table组件.

<img src="http://ufologist.github.io/mobile-fixed-columns-table/images/android-demo-snapshot.png" height="427" width="240" alt="android-demo-app" />

立刻扫描下面的二维码下载Android app体验吧!

<a href="https://github.com/ufologist/mobile-fixed-columns-table/raw/android-demo/bin/fixed-columns-table.apk"><img src="http://ufologist.github.io/mobile-fixed-columns-table/images/android-demo-qrcode.png" height="300" width="300" alt="android-demo-qrcode" /></a>

优势
--------------------
* 兼容Android 2.3.x, 弥补了FixedColumns的不足
* 表格可滚动区域会出现滚动条引导用户操作(iOS上需要tap后才出现), 弥补了FixedColumns的不足
* 没有为达到功能而改动FixedColumns及任何第3方依赖库的源码, 巧妙地借力用力, 因此可以使用FixedColumns中强大的功能, 鱼和熊掌兼得...

使用方法
--------------------
```JavaScript
// 至少需要的参数
$('#table').mobileFixedColumnsTable({ // 请参考DataTables的配置
    'sScrollY': '300px',
    'sScrollX': '100%',
    'bScrollCollapse': true
});
```

```JavaScript
// 更多的配置项
$('#table').mobileFixedColumnsTable({
    'sScrollY': '300px',
    'sScrollX': '100%',
    'bScrollCollapse': true,
    'oLanguage': {
        'sInfo': ''
    }
}, {
    fixedColumnsOptions: { // 请参考DataTables的FixedColumns的配置
        iLeftColumns: 2
    },
    scrollerOptions: { // 请参考iScroll的配置
        onScrollMove: function() {
            console.log(this, arguments);
        }
    }
});
```

示例
--------------------
<a href="http://ufologist.github.io/mobile-fixed-columns-table/mobile-fixed-columns-table-bootstrap.html">mobile fixed columns table与bootstrap一起使用</a>

<a href="http://ufologist.github.io/mobile-fixed-columns-table/mobile-fixed-columns-table-democss.html">mobile fixed columns table与DataTables的demo.css一起使用</a>

依赖
--------------------
1. <a href="http://jquery.com/">jQuery</a>
2. <a href="http://www.datatables.net">DataTables</a> & <a href="http://www.datatables.net/extras/fixedcolumns/">FixedColumns</a>
3. <a href="http://cubiq.org/iscroll-4">iScroll</a>

不是我想要造轮子
--------------------
为什么非要专门为移动平台包装这么一个组件?
主要是因为试过很多可以固定列/表头的表格组件, 在移动平台上使用都不理想.

例如:
* <a href="https://github.com/markmalek/Fixed-Header-Table">Fixed-Header-Table</a>
* <a href="http://www.datatables.net/extras/fixedcolumns/">DataTables - FixedColumns</a>
* <a href="http://docs.sencha.com/extjs/4.2.1/extjs-build/examples/build/KitchenSink/ext-theme-neptune/#locking-grid">Ext JS - Locking Grid</a>

其中最为理想的是FixedColumns, 但在<strong>Android 2.3.x</strong>上(极有可能2.3之前的版本也无法使用, 但未测试过)无法使用, 试过在Android 4.x上一切正常.

但还是有一点点小瑕疵. 由于FixedColumns的实现机制是利用原生的滚动条来控制固定列/表头, 在移动平台上不会出现这个原生的滚动条, 因此会给人不爽的感觉.

想着是否需要参考这些已经成熟的固定列/表头的HTML结构, 自己来实现一个类似的组件, 让其兼容<strong>Android 2.3.x</strong>?

深受启发
--------------------
某日看过某人随便写的一个可以在移动平台上使用的固定列/表头的组件, 虽是个半成品, 但深受启发, 原来使用iScroll来代替原生滚动条就行了, 就这么简单.

解析FixedColumns
--------------------
了解下FixedColumns的原理就豁然开朗了.

主要是通过做联动垂直/水平滚动条来实现滚动区域与固定区域保持一直
<img src="inspiration/img/fixed-columns-scrollbar.jpg" height="385" width="620" alt="FixedColumns产生的原生滚动条">

那么在Android 2.3.x上测试无法使用, 极有可能就是这些原生滚动条出了问题, 造成地无法滚动.

因此我们将这些原生滚动条都用iScroll来代替就好了, 再让iScroll联动
<img src="inspiration/img/fixed-columns-iscroll.jpg" height="365" width="621" alt="用iScroll来替代FixedColumns产生的原生滚动条">

最最关键的好处是, 按照这种思路, 我根本不需要动其他组件的代码, 在FixedColumns组件构造完后, 再加入我将原生滚动条替换成iScroll的方法, 这样对大家都没有影响, 可谓完美的方案.

常见问题
--------------------
Q: 能集成bootstrap一起使用吗?

A: 本组件兼容使用bootstrap作为基础样式库, 但切记一定要覆盖bootstrap默认的table样式max-width: 100%为max-width: none, 否则会使表格宽度无法溢出, 造成不出现水平滚动条的问题.