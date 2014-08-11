(function(window) {

    'use strict';

    //判断浏览器是否支持svg
    if(!(!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect)) {
        seajs.use(['arale/dialog/1.3.0/confirmbox','seajs/seajs-style/1.0.2/seajs-style'],function(ConfirmBox) {
            ConfirmBox.show('您当前的浏览器不支持此功能，推荐使用Chrome或最新浏览器浏览！',function() {},{width:300});
        });
        return;
    }


    seajs.use(['$','gallery/handlebars/1.0.2/handlebars','gallery/d3/3.4.6/d3'],function($,Handlebars) {

        window.PI = window.PI || {};
        window.PI = (function() {

            var diameter= 980,
                width = 980,
                height = 980,
                body = $('body'),
                svgContainer = $('#svg-container'),
                back = svgContainer.find('.back'),
                piClickBox = $('.pi-click-box'),
                piClickBoxUl = piClickBox.find('ul'),
                piHoverBox = $('.pi-hover-box'),
                piHoverBoxUl = piHoverBox.find('ul'),
                piProcessBox = $('.pi-process-box'),
                piProcessBoxUl = piProcessBox.find('ul');

            //base class
            function pi() {

                var that = this;

                that.offsetPos = svgContainer.offset();  //设置初始svf offset top,left

                that.hoverInt = false;  //hover到_circle 500毫秒后判断click是否显示 mouseover状态用
                that.hoverIntClick = false; //hover到_circle 500毫秒后判断click是否显示  click状态用
                that.hoverOut = false;  //如果_circle迅速mouseout，则不显示mouseenter
                that.timerClick = null;  //点击_circle定时参数
                that.timerHover = null; //hover_circle定时参数
                that.timerProcess = null; //hover 进度条定时参数
                that.sliderClickCur = 0;  //click slider cur
                that.sliderHoverCur = 0;  //hover slider cur
                that.sliderProcessCur = 0; //process slider cur


                //装载基础数据
                $.getJSON('./public/js/data.json',function(data) {
                  that.initd3(data);
                });

                //初始化info dom数据
                that.initDom();
                return this;
            }


            //初始化info dom数据
            pi.prototype.initDom = function() {

                var that = this;


                //点击获取鼠标坐标
                svgContainer.click(function(e) {
                    that.offsetX = e.offsetX;
                    that.offsetY = e.offsetY;

                    piClickBox.removeClass('on').fadeOut(200);
                    piHoverBox.removeClass('on').fadeOut(200);
                });

                //处理pic hover显示大图
                svgContainer.on('mouseenter','.pic a',function() {
                    var $this = $(this);
                    var picFloat = $('<div class="pi-pic-float"><span><img src="'+ $this.find('img').attr('src') +'"/></span></div>').appendTo(body);
                    picFloat.css({
                        left:$this.offset().left,
                        top:that.pageYPos === 'top' ? ($this.offset().top + 90) : ($this.offset().top - 220)
                    });
                });

                svgContainer.on('mouseleave','.pic a',function() {
                    $('.pi-pic-float').detach();
                });

                //处理process hover 显示商品
                svgContainer.on('mouseenter','.pi-hover-box li',function() {

                    var $this = $(this);

                    $.ajax({
                        url:'http://gzx.b5m.com/dtdata.html?type_mark=hover_t&keyword='+ encodeURIComponent(that.piChildKey) + '&limit=10&osite='+ $this.attr('data-key'),
                        dataType:'jsonp',
                        jsonp: 'jsonpCallback'
                    }).success(function(data) {

                            var index = $this.index();

                            var _left = $this.offset().left - that.offsetPos.left;
                            if(_left  >= diameter - 300) {
                                _left = diameter - 300;
                            }

                            var _top = parseInt(piHoverBox.css('top'));
                            if(that.pageYPos === 'top') {
                                _top = _top + 135 ;
                            }else {
                                _top = _top - 290;
                            }

                            piProcessBox.css({
                                left:_left,
                                top:_top
                            });

                            piProcessBox.fadeIn(200);

                            var html = '';

                            var source = $('#pi-process-template').html();
                            html += Handlebars.compile(source)(data);

                            piProcessBoxUl.width(data.data.length * 240).html(html);

                            //reset slider
                            that.sliderProcessCur = 0;
                            piProcessBoxUl.parent()[0].scrollLeft = 0;

                        });
                });


                //piHoverBox控制状态
                piProcessBox.on({
                    mouseenter:function() {
                        $(this).data('hover',true);
                    },
                    mouseleave:function() {
                        $(this).data('hover',false);
                        $(this).hide();
                        /* setTimeout(function() {
                         if(!piHoverBox.data('hover')) {
                         piHoverBox.data('hover',false).removeClass('on').fadeOut(200);
                         piProcessBox.data('hover',false).fadeOut(200);
                         }
                         },200);*/
                    }
                });



                //处理hover dom process

                 //pi process box slider 控制
                that.bindBtnClick(piProcessBox,piProcessBoxUl,that.sliderProcessCur,240);

                //处理click dom slider click
                that.bindBtnClick(piClickBox,piClickBoxUl,that.sliderClickCur,850);


                //piHoverBox控制状态
                piHoverBox.on({
                    mouseenter:function() {
                        $(this).data('hover',true);
                    },
                    mouseleave:function() {
                        $(this).data('hover',false);
                        setTimeout(function() {
                            if(!piProcessBox.data('hover')) {
                                piHoverBox.data('hover',false).removeClass('on').fadeOut(200);
                                piProcessBox.data('hover',false).fadeOut(200);
                            }
                        },200);
                    }
                });


                //处理click dom slider hover
                that.bindBtnClick(piHoverBox,piHoverBoxUl,that.sliderHoverCur,94);




            };


            //初始化d3js
            pi.prototype.initd3 = function(data) {

                var that = this,
                    view,   //svg视图控制状态
                    curView, //svg视图控制状态
                    curPanel, //svg视图控制状态
                    root = data;

                //处理pack包
                var pack = d3.layout.pack()
                    .size([width, height])
                    .value(function(d) { return d.value; });
                //   .sort(function() {});


                //创建svg，生成数据
                var svg = d3.select("#svg-container").append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr('class','svg')
                    .append("g")
                    .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")")
                    .attr('class','node-panel')
                    .selectAll('g')
                    .data(pack.nodes(root))
                    .enter();


                //生成svg panel，必须要
                var g = svg.append('g').attr('opacity',0)
                    .attr("class", function(d,i) {
                        //存储bg circle, data，返回zoom等调用
                        if(i ===0) {
                            that.mainGroupElement = this;
                            that.mainGroupData = d;
                        }
                        return i!==0 ? 'color'+ (i%7) : 'colorbg';
                    });


                //第一次加载显示效果
                g.each(function(n,i) {
                    d3.select(this).transition().duration(i*150).attr('opacity',1);
                });

                //创建父circle
                var circle = g.append("circle")
                    .attr("class", function(d,i) {
                        return d.parent ? 'node' : 'nodebg';
                    })
                    /* .style("fill", function(d,i){
                     var c = d.parent ? colors[i%7] : '#f8f8f8';
                     d.color = c;
                     return  c;
                     }).*/
                    .attr("r", function(d,i){
                        return i === 0 ? d.r : (d.r-10);
                    });


                //点击nodebg组织group冒泡
                d3.select('.nodebg').on('click',function() {
                    if(piClickBox.css('display') === 'block') {
                        piClickBox.removeClass('on').fadeOut(200);
                        d3.event.stopPropagation();
                    }
                });


                //g点击事件
                g.on('click',function(d) {
                    zoomEvent.call(this,d);
                });

                //返回键
                back.click(function() {
                    zoomEvent.call(that.mainGroupElement,that.mainGroupData);
                });


                //创建父类text
                var text = g.append("text")
                    .attr("class", "label")
                    .style("opacity", function(d,i) { return i===0 ? 0 :1; })
                    .style("display", function(d,i) { return i === 0 ? 'none' : null; })
                    .attr("transform", function(d) { return "translate(" + 0 + "," + (d.r - 30 + 15) + ")"; })
                    .text(function(d) { return d.name; });


                //缩放
                zoomTo([root.x, root.y, root.r * 2]);


                function zoomEvent(d) {
                    var _this = d3.select(this);

                    //如果是点击同一节点 return
                    if(curPanel === this) {
                        return;
                    }
                    curPanel = this;


                    //判定点击是否circle而不是背景circle
                    $('#circle-zoom').removeAttr('id');
                    if($(this).attr('class') !== 'colorbg') {
                        //排序g,到最后，类似z-index
                        $(this).appendTo($(this).parent());
                        _this.attr('id','circle-zoom');

                        //存储circle key
                        that.pikey = d.name;

                        back.fadeIn(1000);
                    }else {

                        back.fadeOut(1000);

                    }

                    //不是第一次点击click并且curView不为空，则隐藏curView下的子节点
                    if(curView && !curView.empty()) {
                        curView.transition().duration(1000).attr('opacity',0).each('end',function() {
                            //  curView.attr('display','none')
                            curView.remove();
                        });
                    }

                    piClickBox.removeClass('on').fadeOut(200);
                    piHoverBox.removeClass('on').fadeOut(200);



                    zoom(d,function() {

                        if(!d.parent) {
                            return;
                        }

                        var _g = _this.select('g');
                        curView = _g;

                        //如果是第一次点击创建子节点
                        //    if(!_this.attr('data-click') && d.parent) {
                        //       _this.attr('data-click','true');

                        var r = diameter/ 2,   //line半径
                            arr = d.childrens,
                            _arr = [], //获得最大半径用
                            deg = 360/ arr.length;

                        _g  = _this.insert('g','.node');

                        curView = _g;

                        arr.forEach(function(n,i) {
                            _arr.push(n.value);
                        });

                        var rMax = d3.max(_arr);  //获得最大值，赋值给最大半径

                        arr.forEach(function(n,i) {

                            // var _r = (r-30)  - Math.random() * r/2;   //_line半径

                            var _r = (function() {

                                if(i % 3 === 0) {
                                    return (r-30)  + 50 - (r/2) - Math.random()*100;
                                }

                                if(i % 3 ===1) {
                                    return (r-30) + 50 - (r/4) - Math.random()*100;
                                }

                                return (r-30) - Math.random()*50;

                            })();

                            var __r = 20 * (_arr[i] / rMax),  //_circle半径
                                _x = _r * Math.sin( deg * i * Math.PI/180),  //节点坐标x
                                _y = _r * Math.cos( deg * i * Math.PI/180);  //节点坐标y

                            __r = __r < 10 ? 10 :__r;

                            //生成子节点line
                            var line =  _g.append('line')
                                .attr('class','line')
                                .attr('x1',function() {
                                    return _x;
                                })
                                .attr('y1',function() {
                                    return _y;
                                })
                                .style('stroke','#ccc')
                                .style('stroke-width',1)
                                .style('opacity',0.5);

                            //生成子节点circle
                            var _circle = _g.append('circle').
                                attr('class','node-child').
                                //    style('fill', d.color).
                                attr('cx',_x).
                                attr('cy',_y).
                                attr('r',__r);

                            _circle.on('click',function() {
                                that.getItemClickData(this,n);  //参数：_circle半径，_circle data
                            });

                            _circle.on('mouseenter',function(d) {
                                that.hoverOut = true;
                                d3.select(this).attr('class','node-child light');
                                that.getItemHoverOnData(this,n);
                            });

                            _circle.on('mouseleave',function() {
                                that.hoverOut = false;
                                d3.select(this).attr('class','node-child');
                                that.getItemHoverOutData(this,n);
                            });

                            //生成子节点text
                            var _text =_g.append('text')
                                .attr("class", "label-child")
                                .attr("transform", function(d) { return "translate(" + _x + "," + ( _y + __r + 15 )   + ")"; })
                                .text(function() { return n.name; });

                        });

                        //动态显示子节点
                        _g.attr('opacity',0).attr('display','inline').transition().duration(1000).attr('opacity',1);

                    });
                }

                function zoom(d,callback) {

                    var focus = d,
                        zoomVal = d.r/10; //zoom缩放值，根据d.r判断

                    var transition = d3.transition()
                        .duration(1000)
                        .each('end',callback)
                        .tween("zoom", function(d) {
                            var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * ( focus.parent ? zoomVal : 2 )]);
                            return function(t) {
                                zoomTo(i(t));
                            };
                        });
                    //transition.selectAll("text").style("fill-opacity", function(d) { return d.parent === focus ? 1 : 0; });
                    transition.selectAll(".label").style("font-size", function(d) { return d.parent === focus ? 12 : 24; })
                        .attr('fill-opacity',function(d) {
                            if(that.pikey === d.name) {
                                return 1;
                            }
                            return d.parent === focus ? 1 : 0.5; })
                        .attr("transform", function(d) { return  d.parent === focus ? "translate(" + 0 + "," + (d.r - 30 + 15) + ")" : "translate(" + 0 + "," + 10 + ")"; })

                    transition.selectAll(".node").
                        style("fill-opacity", function(d,i) {
                            //1:判断如果是root节点返回1  2:如果是d===focus当前节点，返回1  3:如果点击root节点，则回退到初始，全部显示，否则不显示
                            return d.parent ? ( d === focus ? 1 : (d.parent === focus ? 1 : 0.1)) : 1;
                        });

                }

                function zoomTo(v) {
                    var k = diameter / v[2]; view = v;

                    g.attr("transform", function(d) {
                        if(!d.parent) {
                            return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
                        }
                        return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")";
                    });

                    /* circle.attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
                     */
                    circle.attr("r", function(d,i) {
                        return d.parent ? (d.r - 30) * k : d.r*k;
                    });
                }

                return that;

            };

            //hover_circle on事件
            pi.prototype.getItemHoverOnData = function(el,n) {

                var that = this;

                that.hoverInt = true;  //如果on的500秒内点击了click就不显示

                if(that.timerHover) {
                    clearTimeout(that.timerHover);
                }

                that.timerHover = setTimeout(function() {

                    that.hoverInt = false;
                    if(that.hoverIntClick) {  //如果on的500秒内点击了click就不显示
                        return;
                    }

                    if(!that.hoverOut) {
                        return;
                    }

                    that.piChildKey = n.key;

                    $.ajax({
                        url:'http://gzx.b5m.com/dtdata.html?type_mark=hover_f&keyword='+ encodeURIComponent(n.key),
                        dataType:'jsonp',
                        jsonp: 'jsonpCallback'
                    }).success(function(data) {

                            that.hoverData = data.data;

                            var maxArr = [],max = 0;

                            var axis = that.getAxisObj(parseInt($(el).attr('r')),parseInt($(el).attr('cx')) + diameter/2,parseInt($(el).attr('cy')) + diameter/2,426),
                                html = '';

                            if(piClickBox.hasClass('on')) {
                                piClickBox.removeClass('on').hide();
                            }

                            piHoverBox.addClass('on').fadeIn(200).css({
                                top:axis.y,
                                left:axis.x
                            });


                            //计算最大百分比值
                            $.each(that.hoverData,function(i,n) {
                                maxArr.push(parseInt(n.num));
                            });

                            max = d3.max(maxArr);

                            for(var key in that.hoverData) {
                                html += '<li data-key="'+ key +'"><div class="view-price">￥'+ parseFloat(that.hoverData[key].num.toString()) +'</div><div class="view-process"><span><b style="height:'+ that.hoverData[key].num/max*100 +'%;"></b></span></div><div class="view-text">'+ that.hoverData[key].shop +'</div></li>';
                            }

                            //补充后续空行
                            if(Object.keys(that.hoverData).length < 4) {
                                for(var i=0;i < 4 - Object.keys(that.hoverData).length;i++) {
                                    html += '<li data-key="'+ key +'"><div class="view-price"></div><div class="view-process"></div><div class="view-text"></div></li>';
                                }
                            }

                            piHoverBoxUl.width(parseInt(that.hoverData.length)/2 * 846).html(html);

                            //reset slider
                            that.sliderHoverCur = 0;
                            piHoverBoxUl.parent()[0].scrollLeft = 0;

                        });

                },600);

            };

            //hover_circle out事件
            pi.prototype.getItemHoverOutData = function() {
                setTimeout(function() {
                    if(!piHoverBox.data('hover')) {
                        piHoverBox.removeClass('on').fadeOut(200);
                    }
                },200);
            };

            //点击_circle事件
            pi.prototype.getItemClickData = function(el,n) {

                var that = this;

                if(that.hoverInt) {  //如果on的500秒内点击了click就不显示
                    that.hoverIntClick = true;
                }

                if(that.timerClick) {
                    clearTimeout(that.timerClick);
                }

                //执行数据
                that.timerClick = setTimeout(function() {

                    $.ajax({
                        url:'http://gzx.b5m.com/dtdata.html?type_mark=click&limit=10&keyword='+ encodeURIComponent(n.key),
                        dataType:'jsonp',
                        jsonp: 'jsonpCallback'
                    }).success(function(data) {

                            that.hoverIntClick = false;  //如果on的500秒内点击了click就不显示

                            var axis = that.getAxisObj(parseInt($(el).attr('r')),parseInt($(el).attr('cx')) + diameter/2,parseInt($(el).attr('cy')) + diameter/2,910),
                                html = '';

                            if(piHoverBox.hasClass('on')) {
                                piHoverBox.removeClass('on').hide();
                            }

                            piClickBox.addClass('on').fadeIn(200).css({
                                top:axis.y,
                                left:axis.x
                            });

                            if(data.code === 101) {
                                piClickBoxUl.width(850).html('<li><p style="padding:15px">暂无数据!</p></li>');
                            }else {

                                var source = $('#pi-click-template').html();
                                html += Handlebars.compile(source)(data);

                             /*   $.each(data.data,function(i,n) {
                                    if(i%2===0) {
                                        html += '<li class="cf">';
                                    }
                                    html+= '<div class="item-panel cf"><div class="pic"><a target="_blank" href="'+ n.url +'"><span></span><img src="'+ n.pics.split(',')[0] +'" alt="'+ n.title +'" /></a></div><div class="info-1"><p><a title="'+ n.title +'" target="_blank" href="'+ n.url +'"><span class="light">【'+ n.shop +'】</span>'+ n.title +'</a></p><p><span class="light size">￥'+ parseFloat(n.curr_price.toString()) +'</span></p></div><div class="info-2"><p>降价幅度：<em class="light">'+ Math.round(n.disc*100) +'%</em></p><p>历史最低价：<em>￥'+ parseFloat(n.curr_price.toString()) +'</em></p><p>历史均价：<em>￥'+ Math.round(n.average*100)/100 +'</em></p><p>评论数：<em>'+ n.cmt_num +'</em></p></div></div>';
                                    if(i%2===1) {
                                        html += '</li>';
                                    }
                                });*/

                                piClickBoxUl.width(Math.ceil(data.data.length/2) * 850).html(html);
                            }

                            //reset slider
                            that.sliderClickCur = 0;
                            piClickBoxUl.parent()[0].scrollLeft = 0;

                        });

                },500);
                return that;
            }


            //dialog根据坐标计算值
            pi.prototype.getAxisObj = function(r,x,y,w) {  //radius,x,y,width

                var that = this,
                    _x = 0,
                    _y = 0;

                if(x > (diameter-w)) {
                    _x = diameter - w -10;
                }else {
                    _x = x - 30;
                }

                if(y > diameter/2) {
                    that.pageYPos = 'bottom';
                    _y = y - r -10 - 140;
                }else {
                    that.pageYPos = 'top';
                    _y = y + r + 10;
                }

                return {
                    x:_x,
                    y:_y
                };

            }


            //绑定数据click事件
            pi.prototype.bindBtnClick = function(box,ul,cur,dest) {
                var that = this;
                box.find('.btn-next').click(function() {
                    if(cur === ul.find('li').length -1) {
                        return false;
                    }
                    cur ++;
                    ul.parent().animate({'scrollLeft':cur * dest});
                    return false;
                });

                box.find('.btn-prev').click(function() {
                    if(cur === 0) {
                        return false;
                    }
                    cur --;
                    ul.parent().animate({'scrollLeft':cur * dest});
                    return false;
                });
            };
            return new pi();
        })();




        //Handlerbar Helpers
        Handlebars.registerHelper('h-pics-split', function(pics) {
            return pics.split(',')[0];
        });

        Handlebars.registerHelper('h-curr-price',function(prices) {
            return parseFloat(prices.toString());
        });

        Handlebars.registerHelper('h-disc',function(disc) {
            return Math.round(disc*100);
        });

        Handlebars.registerHelper('h-average',function(average) {
            return Math.round(average*100)/100;
        });

        Handlebars.registerHelper('h-li-ctrl-start',function(i) {
            if(parseInt(i) % 2 === 0) {
                return new Handlebars.SafeString('<li class="cf">');
            }
            return Handlebars.SafeString('');;
        });

        Handlebars.registerHelper('h-li-ctrl-end',function(i) {
            if(parseInt(i) % 2 === 1) {
                return new Handlebars.SafeString('</li>');
            }
            return Handlebars.SafeString('');;
        });



    });



})(window);

