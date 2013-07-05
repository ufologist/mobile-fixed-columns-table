/**
 * 基于DataTables, FixedColumns, iScroll
 * 实现在移动平台上可用的固定列/表头的表格组件
 * 
 * Released under MIT license
 * 
 * @auther Sun https://github.com/ufologist/mobile-fixed-columns-table
 * @version 1.0 2013-7-4
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

        this.initLeftFixedColumnScroller();
        this.initRightFixedColumnScroller();
        this.initFixedHeaderScroller();
        this.disableFixedScroller();
        this.initScrollBodyScroller();
    }

    MobileFixedColumns.prototype = {
        initLeftFixedColumnScroller: function() {
            // 即使iLeftColumns=0的情况下, 让表格左边没有固定列,
            // 也会生成this.fixedColumns.dom.grid.left.body元素
            // 因此这里的判断需要更加严格
            if (this.fixedColumns.dom.grid.left.body && this.fixedColumns.dom.grid.left.body.children.length > 0) {
                // 左边固定列的wrapper
                var leftBodyWrapper = this.fixedColumns.dom.grid.left.body;
                this.leftFixedColumnScroller = new iScroll(leftBodyWrapper, MobileFixedColumns.fixedScrollerOptions);
            }
        },
        initRightFixedColumnScroller: function() {
            if (this.fixedColumns.dom.grid.right.body) {
                // 右边固定列的wrapper
                var rightBodyWrapper = this.fixedColumns.dom.grid.right.body;
                this.rightFixedColumnScroller = new iScroll(rightBodyWrapper, MobileFixedColumns.fixedScrollerOptions);
            }
        },
        initFixedHeaderScroller: function() {
            // 固定表头
            // XXX FixedColumns 没有直接的属性可以获得dataTables_scrollHead, 只能查找DOM了
            var scrollHeader = $(this.fixedColumns.dom.grid.dt).find('.dataTables_scrollHead')[0];
            // 固定表头多余的padding-right造成iscroll拖动到最右边时表头出现空余
            // 这个padding-right是为浏览器原生的垂直滚动条预览的空间
            $(scrollHeader).find('.dataTables_scrollHeadInner').css('padding-right', 0);

            this.fixedHeaderScroller = new iScroll(scrollHeader, MobileFixedColumns.fixedScrollerOptions);
        },
        initScrollBodyScroller: function() {
            // 滚动区域
            var scrollBody = this.fixedColumns.dom.scroller;
            // 让iscroll的垂直滚动条处于正确的位置, 否则会超出到固定表头那里
            $(scrollBody).css('position', 'relative');

            this.scrollBodyScroller = new iScroll(scrollBody, this.scrollerOptions);
        },
        disableFixedScroller: function() { // 让用户不能主动操作固定列/表头的iScroll
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