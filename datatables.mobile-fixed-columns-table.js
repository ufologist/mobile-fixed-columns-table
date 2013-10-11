/**
 * 基于DataTables, FixedColumns, iScroll
 * 实现在移动平台上可用的固定列/表头的表格组件
 * 
 * Released under MIT license
 * 
 * @auther Sun https://github.com/ufologist/mobile-fixed-columns-table
 * @version 1.0.1 2013-10-11
 */
(function($, root) {
    function MobileFixedColumns(fixedColumns, scrollerOptions) {
        var thiz = this;
        this.fixedColumns = fixedColumns;

        this.scrollerOptions = $.extend({}, scrollerOptions, MobileFixedColumns.overrideScrollerOptions);
        var originOnScrollMove = this.scrollerOptions.onScrollMove;
        this.scrollerOptions.onScrollMove = function(event) {
            // 如果原本监听有onScrollMove, 则需要合并进来
            // 这里的this是iScroll对象
            originOnScrollMove && originOnScrollMove.call(this, event);
            // 这里的thiz是MobileFixedColumns对象
            MobileFixedColumns.defaultOnScrollMove.call(thiz, event);
        };

        this.resetScrollWrapperHeight();
        this.initLeftFixedColumnScroller();
        this.initRightFixedColumnScroller();
        this.initFixedHeaderScroller();
        this.disableFixedScroller();
        this.initScrollBodyScroller();
    }

    MobileFixedColumns.prototype = {
        /**
         * 左边固定列的wrapper
         */
        getLeftBodyWrapper: function() {
            return this.fixedColumns.dom.grid.left.body;
        },
        /**
         * 中间的可滚动区域
         */
        getScrollBody: function() {
            return this.fixedColumns.dom.scroller;
        },
        /**
         * 右边固定列的wrapper
         */
        getRightBodyWrapper: function() {
            return this.fixedColumns.dom.grid.right.body;
        },
        hasLeftBodyWrapper: function() {
            // 即使iLeftColumns=0的情况下, 让表格左边没有固定列,
            // 也会生成this.fixedColumns.dom.grid.left.body元素
            // 因此这里的判断需要更加严格
            var leftBodyWrapper = this.getLeftBodyWrapper();
            return leftBodyWrapper && leftBodyWrapper.children.length > 0;
        },
        hasRightBodyWrapper: function() {
            var rightBodyWrapper = this.getRightBodyWrapper();
            return rightBodyWrapper && rightBodyWrapper.children.length > 0;
        },
        resetScrollWrapperHeight: function() {
            // 默认情况下表格的高度是确定的, 因此当可滑动区域(dataTables_scrollBody)
            // 的高度大于表格内容区域的高度小于时, 需要将可滑动区域的高度设置为表格的高度.
            // 这样就不会出现滚动条了.
            // @see jquery.dataTables.js(v1.9.4)#_fnScrollDraw 3453行
            // 
            // 但当我们使用FixedColumns组件来固定表头和列时, 会需要调整表格的高度,
            // 因为当表格固定列中每一行的高度会有可能被撑开(如固定列宽度或由于文字过多换行),
            // 因此我们要根据固定列每一行的高度来重新设置对应表格内容每一行的高度.
            // @see FixedColumns.js(v2.0.3)#_fnEqualiseHeights
            // 
            // 这样一折腾后, 表格内容区域的高度就有可能变高了,
            // 因此可滑动区域(高度还是原来的表格高度)小于这个高度,
            // 造成即使页面区域还有剩余, 但表格总处于可滑动的状态, 会出现垂直滚动条,
            // 功能上倒是没什么影响, 主要是用户体验上有点不好说.
            // 
            // 因此需要在重新计算了表格高度后再调整一次可滑动区域的高度.
            // 
            // 解决方案:
            // 1. 简单粗暴的解决办法
            // 修改 jquery.dataTables.js(v1.9.4)#_fnScrollDraw 3453行
            // nScrollBody.style.height = _fnStringToCss( o.oScroll.sY+iExtra );
            // 直接将滑动区域的高度固定为配置的滑动高度
            // 
            // 2. 完美方案当然还是修改自己的组件了
            //    1) 当表格区域(dom.body)的高度超过了配置的滑动区域高度(s.dt.oScroll.sY)
            //       这时我们就固定可滑动区域的高度为配置的滑动区域高度,
            //       确保可滑动区域不会超过了配置的高度.
            //    2) 当表格区域的高度小于配置的滑动区域高度
            //       这时我们就固定可滑动区域的高度为表格的新高度,
            //       确保可滑动区域与表格一样高, 这样就不会有垂直滚动条了
            var tableOffsetHeight = this.fixedColumns.dom.body.offsetHeight;
            var sScrollY = this.fixedColumns.s.dt.oScroll.sY;
            var scrollBody = this.fixedColumns.dom.scroller;
            if (tableOffsetHeight > sScrollY) {
                scrollBody.style.height = sScrollY + 'px';

                if (this.hasLeftBodyWrapper()) {
                    this.getLeftBodyWrapper().style.height = sScrollY + 'px';
                }
                if (this.hasRightBodyWrapper()) {
                    this.getRightBodyWrapper().style.height = sScrollY + 'px';
                }
            } else {
                scrollBody.style.height = tableOffsetHeight + 'px';

                if (this.hasLeftBodyWrapper()) {
                    this.getLeftBodyWrapper().style.height = tableOffsetHeight + 'px';
                }
                if (this.hasRightBodyWrapper()) {
                    this.getRightBodyWrapper().style.height = tableOffsetHeight + 'px';
                }
            }
        },
        initLeftFixedColumnScroller: function() {
            if (this.hasLeftBodyWrapper()) {
                this.leftFixedColumnScroller = new iScroll(this.getLeftBodyWrapper(), MobileFixedColumns.fixedScrollerOptions);
            }
        },
        initRightFixedColumnScroller: function() {
            if (this.hasRightBodyWrapper()) {
                this.rightFixedColumnScroller = new iScroll(this.getRightBodyWrapper(), MobileFixedColumns.fixedScrollerOptions);
            }
        },
        initFixedHeaderScroller: function() {
            // 固定表头
            var scrollHeader = this.fixedColumns.s.dt.nScrollHead;
            // 固定表头多余的padding-right造成iscroll拖动到最右边时表头出现空余
            // 这个padding-right是为浏览器原生的垂直滚动条预览的空间
            $(scrollHeader).find('.dataTables_scrollHeadInner').css('padding-right', 0);

            this.fixedHeaderScroller = new iScroll(scrollHeader, MobileFixedColumns.fixedScrollerOptions);
        },
        initScrollBodyScroller: function() {
            // 滚动区域
            var scrollBody = this.getScrollBody();
            // 让iscroll的垂直滚动条处于正确的位置, 否则会超出到固定表头那里
            scrollBody.style.position = 'relative';

            this.scrollBodyScroller = new iScroll(scrollBody, this.scrollerOptions);
        },
        /**
         * 让用户不能主动操作固定列/表头的iScroll
         */
        disableFixedScroller: function() {
            this.leftFixedColumnScroller && this.leftFixedColumnScroller.disable();
            this.rightFixedColumnScroller && this.rightFixedColumnScroller.disable();
            this.fixedHeaderScroller.disable();
        }
    };

    // 拖动表格的iscroll来联动固定区域的iscroll
    MobileFixedColumns.defaultOnScrollMove = function(event) {
        // body滚动条的y控制固定列的y
        this.leftFixedColumnScroller && this.leftFixedColumnScroller.scrollTo(0, this.scrollBodyScroller.y);
        this.rightFixedColumnScroller && this.rightFixedColumnScroller.scrollTo(0, this.scrollBodyScroller.y);

        // body滚动条的x控制固定表头的x
        // x和maxScrollX的值都是负值
        var absX = Math.abs(this.scrollBodyScroller.x);
        var absMaxScrollX = Math.abs(this.scrollBodyScroller.maxScrollX);
        // 防止频繁操作固定表头造成表头抖动
        if (absX < absMaxScrollX) {
            this.fixedHeaderScroller.scrollTo(this.scrollBodyScroller.x, 0);
        } else if (absX === absMaxScrollX) { // 如果大幅度拖动(将水平滚动条一拖到底)会造成固定表头跟不上节奏
            this.fixedHeaderScroller.scrollTo(this.fixedHeaderScroller.maxScrollX, 0);
        }
    };

    // 必须限制为这些值 不支持这些参数, 因此覆盖了用户传进来的这些参数
    MobileFixedColumns.overrideScrollerOptions = {
        bounce: false,
        momentum: false,
        wheelAction: 'none'
    };
    MobileFixedColumns.fixedScrollerOptions = {
        bounce: false,
        momentum: false,
        vScrollbar: false, // 将iscroll生成的模拟scrollbar隐藏
        hScrollbar: false
    };

    $.fn.mobileFixedColumnsTable = function(dataTablesOptions, options) {
        var _dataTablesOptions = $.extend({}, dataTablesOptions, $.fn.mobileFixedColumnsTable.overrideDataTablesOptions);
        var fixedColumnsOptions = options && options.fixedColumnsOptions;
        var scrollerOptions = options && options.scrollerOptions;

        var dataTable = this.dataTable(_dataTablesOptions);
        var fixedColumns = new FixedColumns(dataTable, fixedColumnsOptions);
        var mobileFixedColumns = new MobileFixedColumns(fixedColumns, scrollerOptions);

        return this;
    };
    // DataTables的这些参数必须限制为这些值
    $.fn.mobileFixedColumnsTable.overrideDataTablesOptions = {
        bFilter: false,
        bSort: false,
        bPaginate: false
    };
})(jQuery, window);