(function (window, doc) {
    var dummyStyle = doc.createElement('div').style,
        vendor = (function () {
        var vendors = 't,webkitT,MozT,msT,OT'.split(','),
			t,
			i = 0,
			l = vendors.length;

		for ( ; i < l; i++ ) {
			t = vendors[i] + 'ransform';
			if ( t in dummyStyle ) {
				return vendors[i].substr(0, vendors[i].length - 1);
			}
		}
		return false;
    })(),
    cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',
    
    // style properties
	transform = prefixStyle('transform'),
	transitionProperty = prefixStyle('transitionProperty'),
	transitionDuration = prefixStyle('transitionDuration'),
	transformOrigin = prefixStyle('transformOrigin'),
	transitionTimingFunction = prefixStyle('transitionTimingFunction'),
	transitionDelay = prefixStyle('transitionDelay'),
    
    // 3d
    has3d = prefixStyle('perspective') in dummyStyle,
    //translateZ = has3d ? ' translateZ(0)' : '',
    translateZ = '';
    		
	nextFrame = (function() {
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function(callback) { return setTimeout(callback, 1); };
	})(),
    
    // events
    RESIZE_EV = 'onorientationchange',
    START_EV = 'touchstart',
    MOVE_EV = 'touchmove',
    END_EV = 'touchend',
    CANCEL_EV = 'touchcancel',
    TRNEND_EV = (function () {
		if ( vendor === false ) return false;

		var transitionEnd = {
				''			: 'transitionend',
				'webkit'	: 'webkitTransitionEnd',
				'Moz'		: 'transitionend',
				'O'			: 'otransitionend',
				'ms'		: 'MSTransitionEnd'
			};

		return transitionEnd[vendor];
	})();
    
    
    function prefixStyle (style) {
        if ( vendor === '' ) return style;

        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }
    
    Scroll = function(el, options) {
        var that = this, i;
        that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
        that.wrapper.style.overflow = 'hidden';
        that.scroller = that.wrapper.children[0];
        
        // default options
        that.options = {
            hScroll: true,
			vScroll: true,
            x: 0,
            y: 0,
            topOffset: 0,
            bounce: false,
            bounceLock: false,
            lockDirection: true,
            momentum: false,
            // scrollbar
            hScrollbar: true,
            vScrollbar: true,
            fixedScrollbar: true,
            hideScrollbar: false,
            fadeScrollbar: false,
            // Events
            onRefresh: null,
            onBeforeScrollStart: function (e) {e.preventDefault();},
            onScrollStart: null,
			onBeforeScrollMove: null,
			onScrollMove: null,
			onBeforeScrollEnd: null,
			onScrollEnd: null,
			onTouchEnd: null,
			onDestroy: null
        }
        
        // user defined options
        for (i in options) that.options[i] = options[i];
        
        // set starting position
        that.x = that.options.x;
        that.y = that.options.y;
        
        // set some default styles
        that.scroller.style[transitionProperty] = cssVendor + 'transform';
        that.scroller.style[transitionDuration] = '0';
		that.scroller.style[transformOrigin] = '0 0';
        
        that.scroller.style[transitionTimingFunction] = 'cubic-bezier(0.33,0.66,0.66,1)';
        
        that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px)' + translateZ;
        that.refresh();
        
        that._bind('onorientationchange', window);
        that._bind('touchstart');
    };
    Scroll.prototype = {
        enabled: true,
        x: 0,
        y: 0,
        steps: [],
        scale: 1,
        currPageX: 0,
        currPageY: 0,
        pagesX: [],
        pagesY: [],
        aniTime: null,
        // handle event
        handleEvent: function (e) {
            var that = this;
            switch(e.type) {
                case 'touchstart': that._start(e);break;
                case 'touchmove': that._move(e);break;
                case 'touchend':
                case 'touchcancel': that._end(e);break;
                case 'onorientationchange': that._resize();break;
                case TRNEND_EV: that._transitionEnd(e); break;
            }
        },
        // private methods
        _setup: function () {
            
        },
        _bind: function (type, el, bubble) {
            (el || this.scroller).addEventListener(type, this, !!bubble);
        },
        _unbind: function (type, el, bubble) {
            (el || this.scroller).removeEventListener(type, this, !!bubble);
        },
        _start: function (e) {
            var that = this, point = e.touches[0], matrix, x, y, c1, c2;
            
            if (!that.enabled) return;
            
            if (that.options.onBforeScrollStart) that.options.onBeforeScrollStart.call(that, e);
            
            that._transitionTime(0);
            
            that.moved = false;
            that.animating = false;
            that.distX = 0;
            that.distY = 0;
            that.absDistX = 0;
            that.absDistY = 0;
            that.dirX = 0;
            that.dirY = 0;
            
            if (that.options.momentum) {
                matrix = getComputedStyle(that.scroller, null)[transform].replace(/[^0-9\-.,]/g, '').split(',');
				x = +(matrix[12] || matrix[4]);
				y = +(matrix[13] || matrix[5]);
                
                if (x != that.x || y != that.y) {
                    that._unbind(TRNEND_EV);
                    that.steps = [];
                    that._pos(x, y);
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
                }
            }
            
            that.absStartX = that.x;
            that.absStartY = that.y;
            
            that.startX = that.x;
            that.startY = that.y;
            that.pointX = point.pageX;
            that.pointY = point.pageY;
            
            that.startTime = e.timeStamp || Date.now();
            
            if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);
            
            that._bind('touchmove', window);
            that._bind('touchend', window);
            that._bind('touchcancel', window);
        },
        _move: function (e) {
            var that = this,
                point = e.touches[0],
                deltaX = point.pageX - that.pointX,
                deltaY = point.pageY - that.pointY,
                newX = that.x + deltaX,
                newY = that.y + deltaY,
                c1, c2, scale,
                timestamp = e.timeStamp || Date.now();
                
            if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);
            
            that.pointX = point.pageX;
            that.pointY = point.pageY;
            
            if (newX > 0 || newX < that.maxScrollX) {
                newX = that.options.bounce ? that.x + (deltaX / 2) : newX >= 0 || that.maxScrollX >= 0 ? 0 : that.maxScrollX;
            }
            if (newY > that.minScrollY || newY < that.maxScrollY) {
                newY = that.options.bounce ? that.y + (deltaY / 2) : newY >= that.minScrollY || that.maxScrollY >= 0 ? that.minScrollY : that.maxScrollY;
            }
            
            that.distX += deltaX;
            that.distY += deltaY;
            that.absDistX = Math.abs(that.distX);
            that.absDistY = Math.abs(that.distY);
            
            if (that.absDistX < 6 && that.absDistY < 6) {
                return;
            }
            
            // Lock direction
            if (that.options.lockDirection) {
                if (that.absDistX > that.absDistY + 5) {
                    newY = that.y;
                    deltaY = 0;
                } else if (that.absDistY > that.absDistX + 5) {
                    newX = that.x;
                    deltaX = 0;
                }
            }
            
            that.moved = true;
            that._pos(newX, newY);
            that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
            that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
            
            if (timestamp - that.startTime > 300) {
                that.startTime = timestamp;
                that.startX = that.x;
                that.startY = that.y;
            }
            
            if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
        },
        _end: function (e) {
            if (e.touches.length !== 0) return;
            
            var that = this,
                point = e.changedTouches[0],
                target, ev,
                momentumX = { dist:0, time:0 },
                momentumY = { dist:0, time:0 },
                duration = (e.timeStamp || Date.now()) - that.startTime,
                newPosX = that.x,
                newPosY = that.y,
                distX, distY,
                newDuration;
                
            that._unbind('touchmove', window);
            that._unbind('touchend', window);
            that._unbind('touchcancel', window);
            
            if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);
            
            if (!that.moved) {
                that._resetPos(400);
                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }
            if (duration < 300 && that.options.momentum) {
                momentumX = newPosX ? that._momentum(newPosX - that.startX, duration, -that.x, that.scrollerW - that.wrapperW + that.x, that.options.bounce ? that.wrapperW : 0) : momentumX;
                momentumY = newPosY ? that._momentum(newPosY - that.startY, duration, -that.y, (that.maxScrollY < 0 ? that.scrollerH - that.wrapperH + that.y - that.minScrollY : 0), that.options.bounce ? that.wrapperH : 0) : momentumY;
                
                newPosX = that.x + momentumX.dist;
                newPosY = that.y + momentumY.dist;
                
                if ((that.x > 0 && newPosX > 0) || (that.x < that.maxScrollX && newPosX < that.maxScrollX)) momentumX = { dist:0, time:0 };
                if ((that.y > that.minScrollY && newPosY > that.minScrollY) || (that.y < that.maxScrollY && newPosY < that.maxScrollY)) momentumY = { dist:0, time:0 };
            }
            if (momentumX.dist || momentumY.dist) {
                newDuration = Math.max(Math.max(momentumX.time, momentumY.time), 10);
                that.scrollTo(Math.round(newPosX), Math.round(newPosY), newDuration);
                if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
                return;
            }
            
            that._resetPos(200);
            if (that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
        },
        _resize: function () {
            var that = this;
            setTimeout(function () { that.refresh(); }, 200);
        },
        _resetPos: function (time) {
            var that = this,
                resetX = that.x >= 0 ? 0 : that.x < that.maxScrollX ? that.maxScrollX : that.x,
                resetY = that.y >= that.minScrollY || that.maxScrollY > 0 ? that.minScrollY : that.y < that.maxScrollY ? that.maxScrollY : that.y;
            if (resetX == that.x && resetY == that.y) {
                if (that.moved) {
                    that.moved = false;
                    if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);		// Execute custom code on scroll end
                }
                if (that.hScrollbar) {
                    if (vendor == 'webkit') that.hScrollbarWrapper.style[transitionDelay] = '300ms';
                    that.hScrollbarWrapper.style.opacity = '0';
                }
                if (that.vScrollbar) {
                    if (vendor == 'webkit') that.vScrollbarWrapper.style[transitionDelay] = '300ms';
                    that.vScrollbarWrapper.style.opacity = '0';
                }
                return;
            }
            that.scrollTo(resetX, resetY, time || 0);
        },
        _pos: function (x, y) {
            x = this.hScroll ? x : 0;
            y = this.vScroll ? y : 0;
            
            this.scroller.style[transform] = 'translate(' + x + 'px,' + y + 'px) scale(' + this.scale + ')' + translateZ;
            
            this.x = x;
            this.y = y;
            
            this._scrollbarPos('h');
            this._scrollbarPos('v');
        },
        _transitionEnd: function (e) {
            var that = this;

            if (e.target != that.scroller) return;

            that._unbind(TRNEND_EV);
            
            that._startAni();
        },
        _startAni: function () {
            var that = this,
                startX = that.x, startY = that.y,
                startTime = Date.now(),
                step, easeOut,
                animate;

            if (that.animating) return;
            
            if (!that.steps.length) {
                that._resetPos(400);
                return;
            }
            
            step = that.steps.shift();
            
            if (step.x == startX && step.y == startY) step.time = 0;

            that.animating = true;
            that.moved = true;
            
            if (that.options.useTransition) {
                that._transitionTime(step.time);
                that._pos(step.x, step.y);
                that.animating = false;
                if (step.time) that._bind(TRNEND_EV);
                else that._resetPos(0);
                return;
            }

            animate = function () {
                var now = Date.now(),
                    newX, newY;

                if (now >= startTime + step.time) {
                    that._pos(step.x, step.y);
                    that.animating = false;
                    if (that.options.onAnimationEnd) that.options.onAnimationEnd.call(that);			// Execute custom code on animation end
                    that._startAni();
                    return;
                }

                now = (now - startTime) / step.time - 1;
                easeOut = Math.sqrt(1 - now * now);
                newX = (step.x - startX) * easeOut + startX;
                newY = (step.y - startY) * easeOut + startY;
                that._pos(newX, newY);
                if (that.animating) that.aniTime = nextFrame(animate);
            };

            animate();
        },
        _transitionTime: function (time) {
            time += 'ms';
            this.scroller.style[transitionDuration] = time;
            if (this.hScrollbar) this.hScrollbarIndicator.style[transitionDuration] = time;
            if (this.vScrollbar) this.vScrollbarIndicator.style[transitionDuration] = time;
        },
        _offset: function(el) {
            var left = -el.offsetLeft,
                top = -el.offsetTop;
			
            while (el = el.offsetParent) {
                left -= el.offsetLeft;
                top -= el.offsetTop;
            }
            
            if (el != this.wrapper) {
                left *= this.scale;
                top *= this.scale;
            }

            return { left: left, top: top };
        },
        _scrollbar: function(dir) {
            var that = this, bar;
            if (!that[dir + 'Scrollbar']) {
                if (that[dir + 'ScrollbarWrapper']) {
                    if (hasTransform) that[dir + 'ScrollbarIndicator'].style[transform] = '';
                    that[dir + 'ScrollbarWrapper'].parentNode.removeChild(that[dir + 'ScrollbarWrapper']);
                    that[dir + 'ScrollbarWrapper'] = null;
                    that[dir + 'ScrollbarIndicator'] = null;
                }
                return;
            }
            if (!that[dir + 'ScrollbarWrapper']) {
                bar = doc.createElement('div');

                bar.style.cssText = 'position:absolute;z-index:100;' + (dir == 'h' ? 'height:7px;bottom:1px;left:2px;right:' + (that.vScrollbar ? '7' : '2') + 'px' : 'width:7px;bottom:' + (that.hScrollbar ? '7' : '2') + 'px;top:2px;right:1px');

                bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:opacity;' + cssVendor + 'transition-duration:' + (that.options.fadeScrollbar ? '350ms' : '0') + ';overflow:hidden;opacity:' + (that.options.hideScrollbar ? '0' : '1');

                that.wrapper.appendChild(bar);
                that[dir + 'ScrollbarWrapper'] = bar;

                bar = doc.createElement('div');
                bar.style.cssText = 'position:absolute;z-index:100;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);' + cssVendor + 'background-clip:padding-box;' + cssVendor + 'box-sizing:border-box;' + (dir == 'h' ? 'height:100%' : 'width:100%') + ';' + cssVendor + 'border-radius:3px;border-radius:3px';
                bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:' + cssVendor + 'transform;' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1);' + cssVendor + 'transition-duration:0;' + cssVendor + 'transform: translate(0,0)' + translateZ;
                bar.style.cssText += ';' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1)';

                that[dir + 'ScrollbarWrapper'].appendChild(bar);
                that[dir + 'ScrollbarIndicator'] = bar;
            }
            if (dir == 'h') {
                that.hScrollbarSize = that.hScrollbarWrapper.clientWidth;
                that.hScrollbarIndicatorSize = Math.max(Math.round(that.hScrollbarSize * that.hScrollbarSize / that.scrollerW), 8);
                that.hScrollbarIndicator.style.width = that.hScrollbarIndicatorSize + 'px';
                that.hScrollbarMaxScroll = that.hScrollbarSize - that.hScrollbarIndicatorSize;
                that.hScrollbarProp = that.hScrollbarMaxScroll / that.maxScrollX;
            } else {
                that.vScrollbarSize = that.vScrollbarWrapper.clientHeight;
                that.vScrollbarIndicatorSize = Math.max(Math.round(that.vScrollbarSize * that.vScrollbarSize / that.scrollerH), 8);
                that.vScrollbarIndicator.style.height = that.vScrollbarIndicatorSize + 'px';
                that.vScrollbarMaxScroll = that.vScrollbarSize - that.vScrollbarIndicatorSize;
                that.vScrollbarProp = that.vScrollbarMaxScroll / that.maxScrollY;
            }
            that._scrollbarPos(dir, true);
        },
        _scrollbarPos: function(dir, hidden) {
            var that = this,
                pos = dir == 'h' ? that.x : that.y,
                size;
                
            if (!that[dir + 'Scrollbar']) {
            	return;
            }
            
            pos = that[dir + 'ScrollbarProp'] * pos;
            
            if (pos < 0) {
                if (!that.options.fixedScrollbar) {
                    size = that[dir + 'ScrollbarIndicatorSize'] + Math.round(pos * 3);
                    if (size < 8) size = 8;
                    that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
                }
                pos = 0;
            } else if (pos > that[dir + 'ScrollbarMaxScroll']) {
                if (!that.options.fixedScrollbar) {
                    size = that[dir + 'ScrollbarIndicatorSize'] - Math.round((pos - that[dir + 'ScrollbarMaxScroll']) * 3);
                    if (size < 8) size = 8;
                    that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
                    pos = that[dir + 'ScrollbarMaxScroll'] + (that[dir + 'ScrollbarIndicatorSize'] - size);
                } else {
                    pos = that[dir + 'ScrollbarMaxScroll'];
                }
            }

            that[dir + 'ScrollbarWrapper'].style[transitionDelay] = '0';
            that[dir + 'ScrollbarWrapper'].style.opacity = hidden ? '0' : '1';
            that[dir + 'ScrollbarIndicator'].style[transform] = 'translate(' + (dir == 'h' ? pos + 'px,0)' : '0,' + pos + 'px)') + translateZ;
        },
        _momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
            var deceleration = 0.0006,
                speed = Math.abs(dist) / time,
                newDist = (speed * speed) / (2 * deceleration),
                newTime = 0, outsideDist = 0;

            // Proportinally reduce speed if we are outside of the boundaries
            if (dist > 0 && newDist > maxDistUpper) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistUpper = maxDistUpper + outsideDist;
                speed = speed * maxDistUpper / newDist;
                newDist = maxDistUpper;
            } else if (dist < 0 && newDist > maxDistLower) {
                outsideDist = size / (6 / (newDist / speed * deceleration));
                maxDistLower = maxDistLower + outsideDist;
                speed = speed * maxDistLower / newDist;
                newDist = maxDistLower;
            }

            newDist = newDist * (dist < 0 ? -1 : 1);
            newTime = speed / deceleration;

            return { dist: newDist, time: Math.round(newTime) };
        },
        // public methods
        destroy: function () {
            var that = this;

            that.scroller.style[transform] = '';

            // Remove the scrollbars
            that.hScrollbar = false;
            that.vScrollbar = false;
            that._scrollbar('h');
            that._scrollbar('v');

            // Remove the event listeners
            that._unbind('onorientationchange', window);
            that._unbind('touchstart');
            that._unbind('touchmove', window);
            that._unbind('touchend', window);
            that._unbind('touchcancel', window);
            
            if (that.options.useTransition) that._unbind(TRNEND_EV);
		
            if (that.options.checkDOMChanges) clearInterval(that.checkDOMTime);
            
            if (that.options.onDestroy) that.options.onDestroy.call(that);
        },
        refresh: function () {
            var that = this,
                offset,
                i, l,
                els,
                pos = 0,
                page = 0;
                
            that.wrapperW = that.wrapper.clientWidth || 1;
            that.wrapperH = that.wrapper.clientHeight || 1;
            
            that.minScrollY = -that.options.topOffset || 0;
            that.scrollerW = Math.round(that.scroller.offsetWidth );
            that.scrollerH = Math.round(that.scroller.offsetHeight + that.minScrollY);
            that.maxScrollX = that.wrapperW - that.scrollerW;
            that.maxScrollY = that.wrapperH - that.scrollerH + that.minScrollY;
            that.dirX = 0;
            that.dirY = 0;
            
            if (that.options.onRefresh) that.options.onRefresh.call(that);
            
            that.hScroll = that.options.hScroll && that.maxScrollX < 0;
            that.vScroll = that.options.vScroll && (!that.options.bounceLock && !that.hScroll || that.scrollerH > that.wrapperH);
            
            that.hScrollbar = that.hScroll && that.options.hScrollbar;
            that.vScrollbar = that.vScroll && that.options.vScrollbar && that.scrollerH > that.wrapperH;
            offset = that._offset(that.wrapper);
            that.wrapperOffsetLeft = -offset.left;
            that.wrapperOffsetTop = -offset.top;
            
            that._scrollbar('h');
            that._scrollbar('v');
            
            that.scroller.style[transitionDuration] = '0';
			that._resetPos(400);
        },
        scrollTo: function (x, y, time, relative) {
            var that = this,
                step = x,
                i, l;

            that.stop();

            if (!step.length) step = [{ x: x, y: y, time: time, relative: relative }];
            
            for (i=0, l=step.length; i<l; i++) {
                if (step[i].relative) { step[i].x = that.x - step[i].x; step[i].y = that.y - step[i].y; }
                that.steps.push({ x: step[i].x, y: step[i].y, time: step[i].time || 0 });
            }

            that._startAni();
        },
        scrollToElement: function (el, time) {
            var that = this, pos;
            el = el.nodeType ? el : that.scroller.querySelector(el);
            if (!el) return;

            pos = that._offset(el);
            pos.left += that.wrapperOffsetLeft;
            pos.top += that.wrapperOffsetTop;

            pos.left = pos.left > 0 ? 0 : pos.left < that.maxScrollX ? that.maxScrollX : pos.left;
            pos.top = pos.top > that.minScrollY ? that.minScrollY : pos.top < that.maxScrollY ? that.maxScrollY : pos.top;
            time = time === undefined ? Math.max(Math.abs(pos.left)*2, Math.abs(pos.top)*2) : time;

            that.scrollTo(pos.left, pos.top, time);
        },
        scrollToPage: function (pageX, pageY, time) {
            var that = this, x, y;
            
            time = time === undefined ? 400 : time;

            if (that.options.onScrollStart) that.options.onScrollStart.call(that);
            
            x = -that.wrapperW * pageX;
            y = -that.wrapperH * pageY;
            if (x < that.maxScrollX) x = that.maxScrollX;
            if (y < that.maxScrollY) y = that.maxScrollY;
            
            that.scrollTo(x, y, time);
        },
        disable: function () {
            this.stop();
            this._resetPos(0);
            this.enabled = false;

            // If disabled after touchstart we make sure that there are no left over events
            this._unbind('touchmove', window);
            this._unbind('touchend', window);
            this._unbind('touchcancel', window);
        },
        enable: function () {
            this.enabled = true;
        },
        stop: function () {
            this._unbind(TRNEND_EV);
            this.steps = [];
            this.moved = false;
            this.animating = false;
        },
        isReady: function () {
            return !this.moved && !this.animating;
        }
    };
    dummyStyle = null;
    window.Scroll = Scroll;
})(window, document);

(function ($) {
    $.fn.scrollFixedTable = function () {
        var defaults = {
            width:	'100%',
            height: '100%',
            borderCollapse: true,
            themeClass: 'fht-default',
            
            fixedColumn:		 true, // fixed first column
            autoShow:            true, // hide table after its created
            loader:              false,
            footer:              false, // show footer
			cloneHeadToFoot:	 false, // clone head and use as footer
            autoResize:          false, // resize table if its parent wrapper changes size
            create:            	 null // callback after plugin completes
        };
        var settings = {};
        var methods = {
            init : function(options) {

                settings = $.extend({}, defaults, options);

                // iterate through all the DOM elements we are attaching the plugin to
                return this.each(function() {

                    var $self = $(this), // reference the jQuery version of the current DOM element
                        self = this; // reference to the actual DOM element
                    
                    if ( helpers._isTable($self) ) {
                        methods.setup.apply(this, Array.prototype.slice.call(arguments, 1));
                        
                        $.isFunction(settings.create) && settings.create.call(this);
                    } else {
                    	$.error('Invalid table mark-up');
                    }

                });
                
            },
            setup: function() {
                var $self  = $(this),
                    self   = this,
                    $thead = $self.find('thead'),
                    $tfoot = $self.find('tfoot'),
                    $tbody = $self.find('tbody'),
                    $wrapper,
                    $divHead,
                    $divFoot,
                    $divBody,
                    $fixedHeadRow,
                    $temp,
                    tfootHeight = 0;
                
                settings.includePadding = helpers._isPaddingIncludedWithWidth();
                settings.scrollbarOffset = helpers._getScrollbarWidth();
				settings.themeClassName = settings.themeClass;
				
				if ( settings.width.search('%') > -1 ) {
					var widthMinusScrollbar = $self.parent().width() - settings.scrollbarOffset;
				} else {
					var widthMinusScrollbar = settings.width - settings.scrollbarOffset;				
				}
				
                $self.css({
	                    width: widthMinusScrollbar
	                });
	                

                if ( !$self.closest('.fht-table-wrapper').length ) {
                    $self.addClass('fht-table');
                    $self.wrap('<div class="fht-table-wrapper"></div>');
                }

                $wrapper = $self.closest('.fht-table-wrapper');
                
                if ( settings.fixedColumn == true && $wrapper.find('.fht-fixed-column').length == 0 ) {
                	$self.wrap('<div class="fht-fixed-body"></div>');
                	
                	var $fixedColumn = $('<div class="fht-fixed-column"></div>').prependTo($wrapper),
                		$fixedBody	 = $wrapper.find('.fht-fixed-body');
                }
                
                $wrapper.css({
	                    width: settings.width,
	                    height: settings.height
	                })
	                .addClass(settings.themeClassName);

                if ( !$self.hasClass('fht-table-init') ) {
                    
                    $self.wrap('<div class="fht-tbody"></div>');
                        
                }
				$divBody = $self.closest('.fht-tbody');
				
                var tableProps = helpers._getTableProps($self);
                
                helpers._setupClone( $divBody, tableProps.tbody );

                if ( !$self.hasClass('fht-table-init') ) {
                	if ( settings.fixedColumn == true ) {
                		$divHead = $('<div class="fht-thead"><table class="fht-table"></table></div>').prependTo($fixedBody);
                	} else {
                		$divHead = $('<div class="fht-thead"><table class="fht-table"></table></div>').prependTo($wrapper);
                	}
                    
                    $thead.clone().appendTo($divHead.find('table'));
                } else {
                	$divHead = $wrapper.find('div.fht-thead');
                }

                helpers._setupClone( $divHead, tableProps.thead );
                
                $self.css({
                    'margin-top': -$divHead.outerHeight(true)
                });
                
                /*
                 * Check for footer
                 * Setup footer if present
                 */
                if ( settings.footer == true ) {

                	helpers._setupTableFooter( $self, self, tableProps );
                	
                	if ( !$tfoot.length ) {
                		$tfoot = $wrapper.find('div.fht-tfoot table');
                	}
                	
                	tfootHeight = $tfoot.outerHeight(true);
                }

                var tbodyHeight = $wrapper.height() - $thead.outerHeight(true) - tfootHeight - tableProps.border;
                
                $divBody.css({
	                    'height': tbodyHeight
	                });
                
                $self.addClass('fht-table-init');
                
                if ( typeof(settings.altClass) !== 'undefined' ) {
                	$self.find('tbody tr:odd')
                		.addClass(settings.altClass);
                }
                
                if ( settings.fixedColumn == true ) {
                	helpers._setupFixedColumn( $self, self, tableProps );
                }
                
                if ( !settings.autoShow ) {
                    $wrapper.hide();
                }
                
                helpers._bindScroll( $divBody, tableProps );
                
                return self;
            }
        };
        var helpers = {
            /*
			 * return boolean
			 * True if a thead and tbody exist.
			 */
            _isTable: function( $obj ) {
                var $self = $obj,
                    hasTable = $self.is('table'),
                    hasThead = $self.find('thead').length > 0,
                    hasTbody = $self.find('tbody').length > 0;

                if ( hasTable && hasThead && hasTbody ) {
                    return true;
                }
                
                return false;

            },
            
            /*
             * return void
             * bind scroll event
             */
            _bindScroll: function( $obj, tableProps ) {
            	var $self = $obj,
            		$wrapper = $self.closest('.fht-table-wrapper'),
            		$thead = $self.siblings('.fht-thead'),
            		$tfoot = $self.siblings('.fht-tfoot'),
                    that = this;
            	
                scroll = new Scroll($obj.get(0), {
                    onScrollMove: function (e) {
                        var $fixedColumn = $wrapper.find('.fht-fixed-column');
                        $fixedColumn.find('.fht-tbody table').css('-webkit-transform', 'translate(0,' + this.y + 'px)');
                        
                        $thead.find('table').css('-webkit-transform', 'translate(' + this.x + 'px,0)')
                    },
                    onTouchEnd: function(e) {
                        var $fixedColumn = $wrapper.find('.fht-fixed-column');
                        $fixedColumn.find('.fht-tbody table').css('-webkit-transform', 'translate(0,' + this.y + 'px)');
                        
                        $thead.find('table').css('-webkit-transform', 'translate(' + this.x + 'px,0)')
                    }});
                
            	// $self.bind('scroll', function() {
            	    // if ( settings.fixedColumn == true ) {
            	        // var $fixedColumn = $wrapper.find('.fht-fixed-column');
            	        
            	        // $fixedColumn.find('.fht-tbody table')
            	            // .css({
            	                // 'margin-top': -$self.scrollTop()
            	                // });
            	    // }
            	    
            		// $thead.find('table')
            			// .css({
            				// 'margin-left': -this.scrollLeft
            			// });
            		
            		// if ( settings.cloneHeadToFoot ) {
            			// $tfoot.find('table')
	            			// .css({
	            				// 'margin-left': -this.scrollLeft
	            			// });
            		// }
            	// });
            },
            
            /*
             * return void
             */
            _fixHeightWithCss: function ( $obj, tableProps ) {
            	if ( settings.includePadding ) {
	            	$obj.css({
	            		'height': $obj.height() + tableProps.border
	            	});
            	} else {
            		$obj.css({
            			'height': $obj.parent().height() + tableProps.border
            		});
            	}
            },
            
            /*
             * return void
             */
            _fixWidthWithCss: function( $obj, tableProps ) {
            	if ( settings.includePadding ) {
            		$obj.css({
            			'width': $obj.width() + tableProps.border
            		});
            	} else {
            		$obj.css({
            			'width': $obj.parent().width() + tableProps.border
            		});
            	}
            },
            
            /*
             * return void
             */
			_setupFixedColumn: function ( $obj, obj, tableProps ) {
				var $self			= $obj,
					self			= obj,
					$wrapper		= $self.closest('.fht-table-wrapper'),
					$fixedBody		= $wrapper.find('.fht-fixed-body'),
					$fixedColumn	= $wrapper.find('.fht-fixed-column'),
					$thead			= $('<div class="fht-thead"><table class="fht-table"><thead><tr></tr></thead></table></div>'),
					$tbody			= $('<div class="fht-tbody"><table class="fht-table"><tbody></tbody></table></div>'),
					$tfoot			= $('<div class="fht-tfoot"><table class="fht-table"><thead><tr></tr></thead></table></div>'),
					$firstThChild   = $fixedBody.find('.fht-thead thead tr th:first-child'),
					$firstTdChildren,
					fixedColumnWidth = $firstThChild.outerWidth(true) + tableProps.border,
					fixedBodyWidth  = $wrapper.width(),
					fixedBodyHeight = $fixedBody.find('.fht-tbody').height() - settings.scrollbarOffset,
					$newRow;
				
				// Fix cell heights
				helpers._fixHeightWithCss( $firstThChild, tableProps );
				helpers._fixWidthWithCss( $firstThChild, tableProps );
				$firstTdChildren = $fixedBody.find('tbody tr td:first-child')
					.each( function(index) {
						helpers._fixHeightWithCss( $(this), tableProps );
						helpers._fixWidthWithCss( $(this), tableProps );
					});
				
				// clone header
				$thead.appendTo($fixedColumn)
					.find('tr')
					.append($firstThChild.clone());
					
				$tbody.appendTo($fixedColumn)
					.css({
						'margin-top': -1,
						'height': fixedBodyHeight + tableProps.border
					});
				$firstTdChildren.each(function(index) {
					$newRow = $('<tr></tr>').appendTo($tbody.find('tbody'));
					
					if ( settings.altClass && $(this).parent().hasClass(settings.altClass) ) {
						$newRow.addClass(settings.altClass);
					} 
					
					$(this).clone()
						.appendTo($newRow);
				});
				
				// set width of fixed column wrapper
				$fixedColumn.css({
					'width': fixedColumnWidth
				});
				
				// set width of body table wrapper
				$fixedBody.css({
					'width': fixedBodyWidth
				});
				
				// setup clone footer with fixed column
				if ( settings.footer == true || settings.cloneHeadToFoot == true ) {
					var $firstTdFootChild = $fixedBody.find('.fht-tfoot thead tr th:first-child');
					
					helpers._fixHeightWithCss( $firstTdFootChild, tableProps );
					$tfoot.appendTo($fixedColumn)
						.find('tr')
						.append($firstTdFootChild.clone());
					$tfoot.css({
						'top': settings.scrollbarOffset
					});
				}
			},
            
            /*
             * return void
             */
            _setupTableFooter: function ( $obj, obj, tableProps ) {
            	
            	var $self 		= $obj,
            		self  		= obj,
            		$wrapper 	= $self.closest('.fht-table-wrapper'),
            		$tfoot		= $self.find('tfoot'),
            		$divFoot	= $wrapper.find('div.fht-tfoot');
            		
            	if ( !$divFoot.length ) {
            		if ( settings.fixedColumn == true ) {
            			$divFoot = $('<div class="fht-tfoot"><table class="fht-table"></table></div>').appendTo($wrapper.find('.fht-fixed-body'));
            		} else {
            			$divFoot = $('<div class="fht-tfoot"><table class="fht-table"></table></div>').appendTo($wrapper);
            		}
            	}

            	switch (true) {
            		case !$tfoot.length && settings.cloneHeadToFoot == true && settings.footer == true:
            			
            			var $divHead = $wrapper.find('div.fht-thead');
            			
            			$divFoot.empty();
            			$divHead.find('table')
            				.clone()
            				.appendTo($divFoot);
            				
            			break;
            		case $tfoot.length && settings.cloneHeadToFoot == false && settings.footer == true:
            			
            			$divFoot.find('table')
            				.append($tfoot)
	                    	.css({
	                    		'margin-top': -tableProps.border
	                    	});
            				
            			helpers._setupClone( $divFoot, tableProps.tfoot );
            			
            			break;
            	}
            	
            },
            
            /*
             * return object
             * Widths of each thead cell and tbody cell for the first rows.
             * Used in fixing widths for the fixed header and optional footer.
             */
            _getTableProps: function( $obj ) {
                var tableProp = {
                    thead: {},
                    tbody: {},
                    tfoot: {},
                    border: 0
                },
                borderCollapse = 1;
                
                if ( settings.borderCollapse == true ) {
                	borderCollapse = 2;
                }
				
				tableProp.border = ( $obj.find('th:first-child').outerWidth() - $obj.find('th:first-child').innerWidth() ) / borderCollapse;
				
                $obj.find('thead tr:first-child th').each(function(index) {
                    tableProp.thead[index] = $(this).width() + tableProp.border;
                });
                
                $obj.find('tfoot tr:first-child td').each(function(index) {
                	tableProp.tfoot[index] = $(this).width() + tableProp.border;
                });
                
                $obj.find('tbody tr:first-child td').each(function(index) {
                    tableProp.tbody[index] = $(this).width() + tableProp.border;
                });

                return tableProp;
            },
            
            /*
             * return void
             * Fix widths of each cell in the first row of obj.
             */
            _setupClone: function( $obj, cellArray ) {
                var $self    = $obj,
                    selector = ( $self.find('thead').length ) ?
                        'thead th' : 
                        ( $self.find('tfoot').length ) ?
                            'tfoot td' :
                            'tbody td',
                    $cell;
                
                $self.find(selector).each(function(index) {
                    $cell = ( $(this).find('div.fht-cell').length ) ? $(this).find('div.fht-cell') : $('<div class="fht-cell"></div>').appendTo($(this));
					
                    $cell.css({
                        'width': parseInt(cellArray[index])
                    });
                    
                    /*
                     * Fixed Header and Footer should extend the full width
                     * to align with the scrollbar of the body 
                     */
                    if ( !$(this).closest('.fht-tbody').length && $(this).is(':last-child') && !$(this).closest('.fht-fixed-column').length ) {
                    	var padding = ( ( $(this).innerWidth() - $(this).width() ) / 2 ) + settings.scrollbarOffset;
                    	$(this).css({
                    		'padding-right': padding + 'px'
                    	});
                    }
                });
            },
            
            /*
             * return boolean
             * Determine how the browser calculates fixed widths with padding for tables
             * true if width = padding + width
             * false if width = width
             */
            _isPaddingIncludedWithWidth: function() {
            	var $obj 			= $('<table class="fht-table"><tr><td style="padding: 10px; font-size: 10px;">test</td></tr></table>'),
            		defaultHeight,
            		newHeight;
            		
            	$obj.appendTo('body');
            	
            	defaultHeight = $obj.find('td').height();
            	
            	$obj.find('td')
            		.css('height', $obj.find('tr').height());
            		
            	newHeight = $obj.find('td').height();
            	$obj.remove();

            	if ( defaultHeight != newHeight ) {
            		return true;
            	} else {
            		return false;
            	}
            	
            },
            
            /*
             * return int
             * get the width of the browsers scroll bar
             */
            _getScrollbarWidth: function() {
            	var scrollbarWidth = 0;
            	
            	if ( !scrollbarWidth ) {
					if ( $.browser.msie ) {
						var $textarea1 = $('<textarea cols="10" rows="2"></textarea>')
								.css({ position: 'absolute', top: -1000, left: -1000 }).appendTo('body'),
							$textarea2 = $('<textarea cols="10" rows="2" style="overflow: hidden;"></textarea>')
								.css({ position: 'absolute', top: -1000, left: -1000 }).appendTo('body');
						scrollbarWidth = $textarea1.width() - $textarea2.width() + 2; // + 2 for border offset
						$textarea1.add($textarea2).remove();
					} else {
						var $div = $('<div />')
							.css({ width: 100, height: 100, overflow: 'auto', position: 'absolute', top: -1000, left: -1000 })
							.prependTo('body').append('<div />').find('div')
								.css({ width: '100%', height: 200 });
						scrollbarWidth = 100 - $div.width();
						$div.parent().remove();
					}
				}
				
				return scrollbarWidth;
            }

        };
        
        return methods.init.apply(this, arguments);
    }
})(jQuery)