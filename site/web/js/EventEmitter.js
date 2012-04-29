/**
 * EventEmitter v3.1.4
 * https://github.com/Wolfy87/EventEmitter
 *
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 * Oliver Caldwell (olivercaldwell.co.uk)
 */(function(a){function b(){this._events={},this._maxListeners=10}function c(a,b,c,d,e){this.type=a,this.listener=b,this.scope=c,this.once=d,this.instance=e}"use strict",c.prototype.fire=function(a){this.listener.apply(this.scope||this.instance,a);if(this.once)return this.instance.removeListener(this.type,this.listener,this.scope),!1},b.prototype.eachListener=function(a,b){var c=null,d=null,e=null;if(this._events.hasOwnProperty(a)){d=this._events[a];for(c=0;c<d.length;c+=1){e=b.call(this,d[c],c);if(e===!1)c-=1;else if(e===!0)break}}return this},b.prototype.addListener=function(a,b,d,e){return this._events.hasOwnProperty(a)||(this._events[a]=[]),this._events[a].push(new c(a,b,d,e,this)),this.emit("newListener",a,b,d,e),this._maxListeners&&!this._events[a].warned&&this._events[a].length>this._maxListeners&&(typeof console!="undefined"&&console.warn("Possible EventEmitter memory leak detected. "+this._events[a].length+" listeners added. Use emitter.setMaxListeners() to increase limit."),this._events[a].warned=!0),this},b.prototype.on=b.prototype.addListener,b.prototype.once=function(a,b,c){return this.addListener(a,b,c,!0)},b.prototype.removeListener=function(a,b,c){return this.eachListener(a,function(d,e){d.listener===b&&(!c||d.scope===c)&&this._events[a].splice(e,1)}),this._events[a]&&this._events[a].length===0&&delete this._events[a],this},b.prototype.off=b.prototype.removeListener,b.prototype.removeAllListeners=function(a){return a&&this._events.hasOwnProperty(a)?delete this._events[a]:a||(this._events={}),this},b.prototype.listeners=function(a){if(this._events.hasOwnProperty(a)){var b=[];return this.eachListener(a,function(a){b.push(a.listener)}),b}return[]},b.prototype.emit=function(a){var b=[],c=null;for(c=1;c<arguments.length;c+=1)b.push(arguments[c]);return this.eachListener(a,function(a){return a.fire(b)}),this},b.prototype.setMaxListeners=function(a){return this._maxListeners=a,this},typeof define=="function"&&define.amd?define(function(){return b}):a.EventEmitter=b})(this);