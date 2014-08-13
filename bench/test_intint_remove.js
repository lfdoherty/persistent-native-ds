
var pnds = require('./../persistentds')

pnds.makeIntIntMap('test_intint_map', function(m){
	console.log('got m')
	for(var i=0;i<1000*1000*10;++i){
		var k = i
		var v = i + (i % 1000)
		m.put(k,v)
	}
	console.log('size: ' + m.size())
	for(var i=0;i<1000*1000*10;++i){
		var k = i
		m.rm(k)
	}
	console.log('size: ' + m.size())
	m.close(function(){
		console.log('got closed callback')
	})
})
