
var primitivemap = require('primitivemap')

var CommitLog = require('./commitlog')
//var bin = require('./bin')

var EDIT_PUT = 1
var EDIT_REMOVE = 2
var EDIT_CLEAR = 3
var CODE_INDEX = 4

function makeEditBufferPutStringString(p1,p2){
	var len1 = Buffer.byteLength(p1)
	var len2 = Buffer.byteLength(p2)
	var b = new Buffer(14+len1+len2)
	//bin.writeInt(b,0,b.length)
	b.writeInt32BE(b.length,0)
	b[CODE_INDEX] = EDIT_PUT
	//bin.writeInt(b,5,len1)
	//bin.writeInt(b,9,len2)
	b.writeInt32BE(len1,5)
	b.writeInt32BE(len2,9)
	b.write(p1,13)
	b.write(p2,13+len1)
	return b
}
function makeEditBufferRmString(key){
	var len = Buffer.byteLength(key)
	var b = new Buffer(9+len)
	//bin.writeInt(b,0,b.length)
	b.writeInt32BE(b.length,0)
	b[CODE_INDEX] = EDIT_REMOVE
	//bin.writeInt(b,5,len)
	b.writeInt32BE(len,5)
	b.write(key,9)
	return b
}

function doPutStringString(w,edit){
	var len1 = edit.readInt32BE(5)//bin.readInt(edit,5)
	var len2 = edit.readInt32BE(9)//bin.readInt(edit,9)

	var n2 = 13+len1
	w.put(edit.toString('utf8',13,n2),edit.toString('utf8',n2,n2+len2))
}
function doRmString(w,edit){
	var len = edit.readInt32BE(5)//bin.readInt(edit,5)
	w.rm(edit.toString('utf8',9,9+len))
}
function makeEditBufferPutIntInt(p1,p2){
	var b = new Buffer(14)
	b.writeInt32BE(b.length,0)
	b[CODE_INDEX] = EDIT_PUT
	b.writeInt32BE(p1,5)
	b.writeInt32BE(p2,9)
	return b
}
function makeEditBufferRmInt(key){
	var b = new Buffer(9)
	//bin.writeInt(b,0,b.length)
	b.writeInt32BE(b.length,0)
	b[CODE_INDEX] = EDIT_REMOVE
	//bin.writeInt(b,5,key)
	b.writeInt32BE(key,5)
	return b
}
function doPutIntInt(w,edit){
	w.put(edit.readInt32BE(5),edit.readInt32BE(9))
}
function doRmInt(w,edit){
	w.rm(edit.readInt32BE(5))//bin.readInt(edit,5))
}
function makeEditBufferPutIntDouble(p1,p2){
	var b = new Buffer(18)
	b.writeInt32BE(b.length,0)
	b[CODE_INDEX] = EDIT_PUT
	b.writeInt32BE(p1,5)
	b.writeDoubleBE(p2,9)
	return b
}

function doPutIntDouble(w,edit){
	w.put(edit.readInt32BE(5),edit.readDoubleBE(9))
}
function StringStringMap(name, cb){
	var m = this
	var w = this.w = new primitivemap.StringStringMap()
	this.c = new CommitLog(name, function(edit){
		var code = edit[CODE_INDEX]
		if(code === EDIT_PUT){
			doPutStringString(w,edit)
		}else if(code === EDIT_REMOVE){
			doRmString(w,edit)
		}else if(code === EDIT_CLEAR){
			w.clear()
		}else{
			throw new Error('unknown edit type: ' + JSON.stringify(edit))
		}
	},function(){cb(m);})
}

StringStringMap.prototype.put = function(key, value){
	this.w.put(key, value)
	this.c.writeEdit(makeEditBufferPutStringString(key,value))
}
StringStringMap.prototype.rm = function(key){
	this.w.rm(key)
	this.c.writeEdit(makeEditBufferRmString(key))
}

function genericGet(key){
	return this.w.get(key)
}
function genericClose(cb){
	this.c.close(cb)
}
function genericSize(){
	return this.w.size
}

var clearBuffer = new Buffer(5)
//bin.writeInt(clearBuffer,0,5)
clearBuffer.writeInt32BE(5,0)
clearBuffer[4] = EDIT_CLEAR
function genericClear(){
	this.w.clear()
	this.c.writeEdit(clearBuffer)
}

StringStringMap.prototype.clear = genericClear
StringStringMap.prototype.get = genericGet
StringStringMap.prototype.close = genericClose
StringStringMap.prototype.size = genericSize

function IntIntMap(name, cb){
	var m = this
	var w = this.w = new primitivemap.IntIntMap()
	this.c = new CommitLog(name, function(edit){
		var code = edit[CODE_INDEX]
		if(code === EDIT_PUT){
			doPutIntInt(w,edit)
		}else if(code === EDIT_REMOVE){
			doRmInt(w,edit)
		}else if(code === EDIT_CLEAR){
			w.clear()
		}else{
			throw new Error('unknown edit type: ' + JSON.stringify(edit))
		}
	},function(){cb(m);})
}
IntIntMap.prototype.put = function(key, value){
	this.w.put(key, value)
	this.c.writeEdit(makeEditBufferPutIntInt(key,value))
}
IntIntMap.prototype.rm = function(key){
	this.w.rm(key)
	this.c.writeEdit(makeEditBufferRmInt(key))
}
IntIntMap.prototype.clear = genericClear
IntIntMap.prototype.get = genericGet
IntIntMap.prototype.close = genericClose
IntIntMap.prototype.size = genericSize

function IntDoubleMap(name, cb){
	var m = this
	var w = this.w = new primitivemap.IntDoubleMap()
	this.c = new CommitLog(name, function(edit){
		var code = edit[CODE_INDEX]
		if(code === EDIT_PUT){
			doPutIntDouble(w,edit)
		}else if(code === EDIT_REMOVE){
			doRmInt(w,edit)
		}else if(code === EDIT_CLEAR){
			w.clear()
		}else{
			throw new Error('unknown edit type: ' + JSON.stringify(edit))
		}
	},function(){cb(m);})
}
IntDoubleMap.prototype.put = function(key, value){
	this.w.put(key, value)
	this.c.writeEdit(makeEditBufferPutIntDouble(key,value))
}
IntDoubleMap.prototype.clear = genericClear
IntDoubleMap.prototype.rm = IntIntMap.prototype.rm
IntDoubleMap.prototype.get = genericGet
IntDoubleMap.prototype.close = genericClose
IntDoubleMap.prototype.size = genericSize

exports.makeStringStringMap = function(name,cb){return new StringStringMap(name,cb);}
exports.makeIntIntMap = function(name,cb){return new IntIntMap(name,cb);}
exports.makeIntDoubleMap = function(name,cb){return new IntDoubleMap(name,cb);}


