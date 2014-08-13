
var pnds = require('./../persistentds')

pnds.makeStringStringMap('testmap', function(m){
	console.log('got m')
	for(var i=0;i<1000*1000;++i){
		m.put('key_'+i, 'value_'+Math.random())
	}
	console.log('size: ' + m.size())
	for(var i=0;i<1000*1000;++i){
		m.rm('key_'+i)
	}
	console.log('size: ' + m.size())
	m.close(function(){
		console.log('got closed callback')
	})
})
