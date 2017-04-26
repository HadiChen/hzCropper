/**
 * hzCropper.js
 * 861883474@qq.com
 * Created by hadi
 * 2016.10.20
 */

;(function($){
	'use strict';
	var $doc = $(document),
		wrap_class = '.hzCropper-wrap',
		//操作事件,使用命名空间，防止解绑事件冲突
		event_mouse_down = 'mousedown.drap touchstart.drap',
		event_mouse_move = 'mousemove.drap touchmove.drap',
		event_mouse_up = 'mouseup.drap mouseleave.drap touchend.drap touchleave.drap touchcancel.drap',
		event_mouse_select = 'mousedown.drap click.drap touchstart.drap',
		//自定义事件
		event_drag = 'hzCropper',
		event_drag_start = event_drag+'.dragstart',
		event_drag_move = event_drag+'.dragmove',
		event_drag_end = event_drag+'.dragend',
		//判断操作类型...分别为左上、上中、右上，右中、下右、下中、下左、左中、移动、旋转
		regexp_drap_types = /^(lt|tc|rt|rc|rb|bc|lb|lc|move|rotates)$/,

		pint = parseInt,
		pfloat = parseFloat,

		round = Math.round,
		asin = Math.asin,
		acos = Math.acos,
		pi = Math.PI,
		abs = Math.abs,
		atan = Math.atan;

	function isNumber(n) {
	    return typeof n === 'number';
	}

	function isUndefined(n) {
	    return typeof n === 'undefined';
	}

	function isFunction(n){
		return typeof n === 'function';
	}

	function isString(n){
		return typeof n === 'string';
	}

	function toArray(obj, offset) {
	    var args = [];

	    if (!!isNumber(offset)) {
	      	args.push(offset);
	    }

	    return args.slice.apply(obj,args);
	}

	function proxy(fn, context) {
	    var args = toArray(arguments, 2);

	    return function () {
	      	return fn.apply(context,args.concat(toArray(arguments)));
	    };
	}

	function getStyle(data){
		var style = [];

		style.push('width:'+data.$element.width()+'px');
		style.push('height:'+data.$element.height()+'px');
		style.push('left:'+data.$element.css('left'));
		style.push('margin:'+data.$element.css('margin'));
		//style.push('top:'+(getStyleNun(data.$element,'top')+data.options.index*100)+'px');
		style.push('top:'+getStyleNun(data.$element,'top')+'px');
		style.push('transform:'+getRotateValue(getRotateStyle(data.$element)));

		data.$element.css({
			position:'static',
			// left:0,
			// top:0,
			margin:0,
			transform:'none'
		});

		return style;
	}

	function getStyleNun(element,type){
		var style = element.css(type);
		return removePx(style);
	}

	function removePx(num){
		var numns = num.indexOf('px') > -1 ? pfloat(num.split('px')[0]) : pfloat(num);
		return numns;
	}

	function getRotateStyle(element){
		var rotate = element.css('transform') === 'none'? 'matrix(1, 0, 0, 1, 0, 0)' : element.css('transform');

		rotate = rotate.replace('matrix','');
		rotate = rotate.replace('(','');
		rotate = rotate.replace(')','');
		rotate = rotate.split(',');

		return getRotateNum(rotate[0],rotate[1],rotate[2],rotate[3],rotate[4],rotate[5]);
	}

	function getRotateNum(a,b,c,d,e,f){
        var deg = 0;

		var aa = round(180 * asin(a) / pi),
        	bb = round(180 * acos(b) / pi),
        	cc = round(180 * asin(c) / pi),
        	dd = round(180 * acos(d) / pi); 

        if(aa === bb|| - aa === bb){  
            deg = dd;  
        }else if(-aa + bb === 180){  
            deg = 180 + cc;  
        }else if(aa + bb === 180){  
            deg = 360 - cc || 360 - dd;  
        }  

        return deg >= 360 ? 0 : deg;  
	}

	function getRotateValue(degree) {
		degree = degree === 'none'? 0: degree;
	    return 'rotateZ(' + degree + 'deg)';
	}

	function docUnbing(){
		if($('.hzCropper-wrap').length === 0){
			$doc.off(event_mouse_move).off(event_mouse_up).off(event_mouse_select);
		}
	}

	$.fn.hzCropper = function(options){
		var that = this;
		setTimeout(function(){
			return new hzCropper(that,options);
		},0);
	};

	var hzCropper = function(element,options){
		var that = this;

		that.element = element;
		that.$element = $(that.element);

		if(!!isString(options) && (options === "destroy" || options ===  "removes")){
			switch(options){
				case 'destroy':
					that.destroy();
					break;
				case 'removes':
					that.removes();
					break;
			}
			return;
		}

		that.options = options || {};
		that.options.index = !isNumber(that.options.index) ? 1 : that.options.index;
		that.options.atuoOut = that.options.atuoOut === true ? true : false;
		that.options.minHeight = !isNumber(that.options.minHeight) ? 20 : that.options.minHeight;
		that.options.minWidth = !isNumber(that.options.minWidth) ? 20 : that.options.minWidth;
		that.options.isSelect = that.options.isSelect === true;

		that.options.result = isFunction(that.options.result) ? that.options.result : function(){};
		that.options.ready = isFunction(that.options.ready) ? that.options.ready : function(){};
		that.options.onSelect = isFunction(that.options.onSelect) ? that.options.onSelect : function(){};
		that.options.noChoice = isFunction(that.options.noChoice) ? that.options.noChoice : function(){};

		that.dom = {};
		that.isDrap = false;

		that.cropBox = {
			width:0,
			height:0,
			left:0,
			top:0,
			rotate:0
		};

		that.setHtml();
		that.addListeners();

		that.options.ready.call(that.element[0]);
		if(!!that.options.isSelect){
			var obj = {
				index:that.options.index
			};

			$.extend(obj,that.cropBox);
			
			that.options.onSelect.call(that.element[0],obj);
		}
	};

	hzCropper.prototype = {
		//插入html并获取dom
		setHtml:function(){
			var that = this;
			var html = '<div class="hzCropper-inner" hz-drap="move">'+
							'<div class="hzCropper-handle rotates" hz-drap="rotates"></div>'+
							'<div class="hzCropper-handle lt" hz-drap="lt"></div>'+
							'<div class="hzCropper-handle tc" hz-drap="tc"></div>'+
							'<div class="hzCropper-handle rt" hz-drap="rt"></div>'+
							'<div class="hzCropper-handle lb" hz-drap="lb"></div>'+
							'<div class="hzCropper-handle lc" hz-drap="lc"></div>'+
							'<div class="hzCropper-handle rc" hz-drap="rc"></div>'+
							'<div class="hzCropper-handle bc" hz-drap="bc"></div>'+
							'<div class="hzCropper-handle rb" hz-drap="rb"></div>'+
						'</div>',
				className = that.options.isSelect ? 'active' : '';

			that.cropBox.width = getStyleNun(that.$element,'width');
			that.cropBox.height = getStyleNun(that.$element,'height');
			that.cropBox.left = getStyleNun(that.$element,'left');
			that.cropBox.top = getStyleNun(that.$element,'top');
			that.cropBox.top = getStyleNun(that.$element,'top');
			that.cropBox.margin = getStyleNun(that.$element,'margin');

			if(that.options.isSelect){
				$(wrap_class).removeClass('active');
			}

			if(that.$element.closest('.hzCropper-wrap').length === 0 && that.$element.closest('.hzCropper-contain').length === 0){
				that.$element.wrap('<div class="hzCropper-wrap '+className+'" style="'+getStyle(that).join(';')+'"></div>').wrap('<div class="hzCropper-contain"></div>');
			}

			that.$element.attr('hzCropper','hzCropper');

			that.dom.$wrap = that.$element.closest('.hzCropper-wrap');

			that.dom.$contain = that.dom.$wrap.find('.hzCropper-contain');
			
			if(that.dom.$wrap.find('.hzCropper-inner').length === 0){
				that.dom.$wrap.append(html);
			}

			that.dom.$inner = that.dom.$wrap.find('.hzCropper-inner');
		},
		//事件绑定
		addListeners:function(){
			var that = this;
			//当鼠标按下强制执行dragstart
			that.dom.$wrap.on(event_mouse_down,$.proxy(that.dragstart,that)).on(event_mouse_select,function(e){
				e.stopPropagation();
				var _this = this;
				
				if(that.dragType){
					$(wrap_class).removeClass('active');
					$(_this).addClass('active');
					var obj = {
						index : that.options.index,
						width:pfloat(that.dom.$wrap.css('width').split('px')[0]),
						height:pfloat(that.dom.$wrap.css('height').split('px')[0]),
						top:pfloat(that.dom.$wrap.css('top').split('px')[0]),
						left:pfloat(that.dom.$wrap.css('left').split('px')[0]),
						rotate:getRotateStyle(that.dom.$wrap)
					};
					that.options.onSelect.call(that.element[0],obj);
				}

			});

			$doc.on(event_mouse_move,(that._dragmove = proxy(that.dragmove, that))).on(event_mouse_up,(that._dragend = proxy(that.dragend, that))).on(event_mouse_select,function(e){
				if(!that.dragType && !!that.options.atuoOut){
					$(wrap_class).removeClass('active');
					that.options.noChoice.call(that.element[0]);
				}
			});
		},
		//拖动开始
		dragstart:function(event){
			var that = this;

			var e = event,
				originalEvent = e.originalEvent,
		        dragType,
		        dragStartEvent;

		    // if(!!that.disabled){
		    // 	return;
		    // }
		    //获取操作类型
		    dragType = dragType || $(e.target).attr('hz-drap');

		    //判断是否是合法操作
		    if(!!regexp_drap_types.test(dragType)){
		    	event.preventDefault();

		    	dragStartEvent = $.Event(event_drag_start,{
		    		originalEvent : originalEvent,
		    		dragType : dragType
		    	});
		    	//触发事件
        		that.$element.trigger(dragStartEvent);
        		//判断事件是否默认浏览器默认行为
        		if (!!dragStartEvent.isDefaultPrevented()) {
		          	return;
		        }

		        that.dragType = dragType;
		        that.startX = e.pageX;
		        that.startY = e.pageY;
		        console.log(that.startX);
		        console.log(that.startY);
		    }
		},
		//拖动过程
		dragmove:function(event){
			var that = this;

			var e = event,
				originalEvent = e.originalEvent,
		        dragType = that.dragType,
		        dragMoveEvent;

		    // if (!!that.disabled) {
		    //     return;
		    // }

		    if(!!dragType){
		    	event.preventDefault();
		    	dragMoveEvent = $.Event(event_drag_move, {
		          	originalEvent: originalEvent,
		          	dragType: dragType
		        });

        		that.$element.trigger(dragMoveEvent);
        		if (!!dragMoveEvent.isDefaultPrevented()) {
		          	return;
		        }

		        that.endX = e.pageX;
		        that.endY = e.pageY;
		        that.isDrap = true;
		        that.change();
		        
		    }
		},
		//拖动结束
		dragend:function(event){
			var that = this;

			var dragType = that.dragType,
          		dragEndEvent;

      //     	if (that.disabled) {
		    //     return;
		    // }

		    if(!!dragType){
        		event.preventDefault();
        		dragEndEvent = $.Event(event_drag_end, {
		          	originalEvent: event.originalEvent,
		          	dragType: dragType
		        });

        		that.$element.trigger(dragEndEvent);

        		if (!!dragEndEvent.isDefaultPrevented()) {
		          	return;
		        }
		        that.dragType = '';

		        var obj = {
						index : that.options.index
					};

				if(!!that.isDrap){
					that.isDrap = false;
					$.extend(true, obj,that.cropBox);
				}else{
					obj = {
						index : that.options.index,
						width:pfloat(that.dom.$wrap.css('width').split('px')[0]),
						height:pfloat(that.dom.$wrap.css('height').split('px')[0]),
						top:pfloat(that.dom.$wrap.css('top').split('px')[0]),
						left:pfloat(that.dom.$wrap.css('left').split('px')[0]),
						rotate:getRotateStyle(that.dom.$wrap)
					};
				}

		        that.options.result.call(that.element[0],obj);
		    }
		},
		//改变
		change:function(){
			var that = this;

			var dragType = that.dragType,
		        renderable = true,
		        cropBox = that.cropBox,

		        minHeight = that.options.minHeight,

		        $wrap = that.dom.$wrap,

		        width = $wrap.width(),
		        height = $wrap.height(),
		        left = getStyleNun($wrap,'left'),
		        top = getStyleNun($wrap,'top'),

		        rotate = getRotateStyle($wrap)%360,

		        range = {
		        	x: that.endX - that.startX,
		        	y: that.endY - that.startY
		        },
		        offset;
		    switch(dragType){
		    	//移动
		    	case 'move':
		    		left += range.x;
        			top += range.y;
		    		break;
		    	//左上
		    	case 'lt':

		          	if (range.x <= 0) {
		            	if (left > 0) {
		              		width -= range.x;
		              		left += range.x;
		            	} else if (range.y <= 0) {
		              		renderable = false;
		            	}
			        }else {
			            width -= range.x;
			            left += range.x;
			        }

		          	if (range.y <= 0) {
		            	if (top > 0) {
		              		height -= range.y;
		              		top += range.y;
		            	}
		          	} else {
		            	height -= range.y;
		            	top += range.y;
		          	}

			        if (width < 0 && height < 0) {
			          	dragType = 'rb';
			          	height = 0;
			          	width = 0;
			        } else if (width < 0) {
			          	dragType = 'rt';
			          	width = 0;
			        } else if (height < 0) {
			          	dragType = 'lb';
			          	height = 0;
			        }
		    		break;
		    	//上中
		    	case 'tc':

			        height -= range.y;
			        top += range.y;

			        if (height < 0) {
			          	dragType = 'bc';
			          	height = 0;
			        }
		    		break;
		    	//上右
		    	case 'rt':

			        width += range.x;

			        if (range.y <= 0) {
			            if (top > 0) {
			              height -= range.y;
			              top += range.y;
			            }
			        } else {
			            height -= range.y;
			            top += range.y;
			        }

				    if (width < 0 && height < 0) {
				        dragType = 'lb';
				        height = 0;
				        width = 0;
				    } else if (width < 0) {
				        dragType = 'lt';
				        width = 0;
				    } else if (height < 0) {
				        dragType = 'rb';
				        height = 0;
				    }
		    		break;
		    	//右中
		    	case 'rc':
			        width += range.x;

			        if (width < 0) {
			          	dragType = 'lc';
			          	width = 0;
			        }
		    		break;
		    	//下右
		    	case 'rb':
		           	width += range.x;
		            height += range.y;

			        if (width < 0 && height < 0) {
			          	dragType = 'lt';
			          	height = 0;
			          	width = 0;
			        } else if (width < 0) {
			          	dragType = 'lb';
			          	width = 0;
			        } else if (height < 0) {
			          	dragType = 'rt';
			          	height = 0;
			        }
		    		break;
		    	//下中
		    	case 'bc':
			        height += range.y;

			        if (height < 0) {
			          	dragType = 'tc';
			          	height = 0;
			        }
		    		break;
		    	//左下
		    	case 'lb':

		          	width -= range.x;
		            left += range.x;
		            height += range.y;

			        if (width < 0 && height < 0) {
			          	dragType = 'rt';
			          	height = 0;
			          	width = 0;
			        } else if (width < 0) {
			          	dragType = 'rb';
			          	width = 0;
			        } else if (height < 0) {
			          	dragType = 'lb';
			          	height = 0;
			        }
		    		break;
		    	//左中
		    	case 'lc':
			        width -= range.x;
			        left += range.x;

			        if (width < 0) {
			          	dragType = 'rc';
			          	width = 0;
			        }
		    		break;
		    	//旋转
		    	case 'rotates':

		    		if(range.x && range.y){
		    			var mouseX = 0,
		    				mouseY = 0,
		    				//圆心位置
		    				cx = width/2,
		    				cy = height/2,

		    				ox,oy,
		    				//鼠标相对于旋转中心的角度
		    				angle;

		    			//获取偏移角度
          				offset = $wrap.offset();

		    			//计算出鼠标相对于画布顶点的位置
          				mouseX = that.startX - offset.left;
          				mouseY = that.startY - offset.top;

          				ox = mouseX - cx;
          				oy = mouseY - cy;

          				angle = atan(abs(ox/oy))/(2*pi)*360;

          				if( ox < 0 && oy < 0){
							angle = -angle;
						}else if( ox < 0 && oy > 0){
							angle = -( 180 - angle);
						}else if( ox > 0 && oy < 0){
							angle = angle;
						}else if( ox > 0 && oy > 0){
							angle = 180 - angle;
						}

						rotate = angle;
		    		}
		    		
		    		break;
		    }

		    if (renderable) {
		    	cropBox.width = width;
		      	cropBox.height = height;
		      	cropBox.left = left;
		      	cropBox.top = top;
		      	cropBox.rotate = rotate;
		      	that.dragType = dragType;

		      	that.renderCropBox();
		    }

		    // 
		    that.startX = that.endX;
		    that.startY = that.endY;
		},
		//显示改变
		renderCropBox:function(){
			var that = this;

			var container = that.container,
				options = that.options,
		        $wrap = that.dom.$wrap,
		        cropBox = that.cropBox;

		    cropBox.width = cropBox.width <= options.minWidth ? options.minWidth : cropBox.width;
		    cropBox.height = cropBox.height <= options.minHeight ? options.minHeight : cropBox.height;

		    $wrap.css({
		    	width:cropBox.width+'px',
		    	height:cropBox.height+'px',
		    	top:cropBox.top+'px',
		    	left:cropBox.left+'px',
		    	transform:getRotateValue(cropBox.rotate)
		    });

		    that.$element.css({
		    	width:cropBox.width+'px',
		    	height:cropBox.height+'px',
		    	top:cropBox.top+'px',
		    	left:cropBox.left+'px'
		    });
		},
		//销毁
		destroy:function(){
			var that = this;
			that.$element.removeAttr('hzCropper');
			that.$element.off(event_drag);
			that.$element.closest('.hzCropper-wrap').off().find('.hzCropper-inner').remove();
			that.$element.unwrap('.hzCropper-contain').unwrap('.hzCropper-wrap');
		},
		//销毁，并且dom也移除
		removes:function(){
			var that = this;
			that.$element.off().closest('.hzCropper-wrap').off().remove();
		}
	};

}(window.jQuery));