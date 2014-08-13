/*

Writes the commit log as a sequence of chunks/files.  Once a chunk has been sufficiently 
invalidated by later edits, rewrites it into the commit log (omitting invalidated edits)
and deletes the chunk/file.

Wraps maps, and will eventually wrap sets as well.

Invalidation is done by periodically re-reading old chunks slowly in a "background" way,
and working out how much of the chunk has been invalidated.

TODO implement invalidation

*/

var CHUNK_SIZE = 4*1024*1024
var BUFFER_SIZE = 4*1024*1024

//var fs = require('fs')
var fs = require('fs-ext');

var bin = require('./bin')

function zeropad(n,str){
	str = str+''
	while(str.length < n) str = '0'+str
	return str
}

var FirstFilename = zeropad(8,'0')

function CommitLog(path, editCb, doneCb){
	var local = this
	this.maxChunkSize = CHUNK_SIZE;
	this.path = path
	this.buf = new Buffer(BUFFER_SIZE)
	this.bufOffset = 0
	
	this.timeoutFunction = function(){
		local.nextTimeoutHandle = undefined
		local.flush()
		local._tryNewChunk()
	}
	this.nextTimeoutHandle = setTimeout(this.timeoutFunction,100)
	
	function checkFlock(cb){
		fs.open(path+'/.lockfile', 'w', function(err, fd){
			local.lockFd = fd
			if(err) throw err
			fs.flock(fd, 'exnb', function(err){
				if(err){
					if(err.code === 'EAGAIN'){
						throw new Error('could not get file lock here: ' + path + ', maybe already in use?')
					}
					throw err
				}
				console.log('got lock')
				cb()
			})
		})
	}
	function finish(lastFilename){
		if(!lastFilename) lastFilename = FirstFilename
		fs.stat(path+'/'+lastFilename, function(err, stat){
			if(!err){
				local.wsSize = stat.size
			}else if(err.code === 'ENOENT' && lastFilename === FirstFilename){
				local.wsSize = 0
			}else{
				throw err
			}
			//console.log('byte size: ' + stat.size)
			local.wsFilename = lastFilename
			local.ws = fs.createWriteStream(path+'/'+lastFilename, {
				flags: 'a',
				encoding: 'utf8'
			})
			local.ws.on('open', function(){
				doneCb()
			})
		})
	}
	fs.readdir(path, function(err, files){
		if(err){
			if(err.code === 'ENOENT'){
				fs.mkdir(path, function(err){
					if(err) throw err
					checkFlock(function(){
						finish()
					})
				})
			}else{
				throw err
			}
		}else{
			checkFlock(function(){
				if(files.length === 0){
					finish()
				}else{
					files.sort(function(a,b){
						return parseInt(a) - parseInt(b)
					})
					var lastFilename = files[files.length-1]
					var remaining = files.length
					//console.log('files: ' + JSON.stringify(files))
					function readFile(){
						if(files.length === 0) return
						var f = files.shift()
						fs.readFile(path+'/'+f, function(err, buf){
							if(err) throw err
					
							var i = 0
							while(i+4 < buf.length){
								var editLen = bin.readInt(buf,i)
								if(i+editLen > buf.length){
									break
								}
								var edit = buf.slice(i,i+editLen)
								editCb(edit)
								i += editLen
							}
							/*var lines = str.split('\n')
							lines.forEach(function(line){
								if(!line) return
						
								var json = JSON.parse(line)
								editCb(json)
							})*/
					
							--remaining
							if(remaining === 0){
								finish(lastFilename)
							}else{
								readFile()
							}
						})
					}
					readFile()
				}
			})
		}
	})
}
CommitLog.prototype.flush = function(){
	if(this.bufOffset > 0){
		this.ws.write(this.buf.slice(0,this.bufOffset))
		this.wsSize += this.bufOffset
		this.buf = new Buffer(BUFFER_SIZE)
		this.bufOffset = 0
		if(this.nextTimeoutHandle){
			clearTimeout(this.nextTimeoutHandle)
			this.nextTimeoutHandle = undefined
		}
	}	
}
CommitLog.prototype.writeEdit = function(buf){
	//var buf = new Buffer(JSON.stringify(edit)+'\n')
	if(this.bufOffset + buf.length <= this.buf.length){
		buf.copy(this.buf,this.bufOffset)
		this.bufOffset += buf.length
		if(!this.nextTimeoutHandle){
			this.nextTimeoutHandle = setTimeout(this.timeoutFunction,100)
		}
	}else{
		this.flush()
		this.ws.write(buf)
		this.wsSize += buf.length
		this._tryNewChunk()
	}	
}
CommitLog.prototype._tryNewChunk = function(){
	if(this.wsSize > this.maxChunkSize){
		var newFilename = zeropad(8,(parseInt(this.wsFilename)+1))
		//console.log('moving to new chunk ' + newFilename)
		this.wsSize = 0
		this.wsFilename = newFilename
		this.ws = fs.createWriteStream(this.path+'/'+newFilename, {
			flags: 'a',
			encoding: 'utf8'
		})
	}
}
CommitLog.prototype.close = function(cb){
	this.flush()
	var local = this
	this.ws.end(function(){
		fs.flock(local.lockFd, 'un', function(err){
			if(err) throw err
			//console.log('lock file unlocked')
			if(cb) cb()
		})
	})
	this.ws = undefined
	this.buf = undefined
	//console.log('commit log closed')
}


module.exports = CommitLog
