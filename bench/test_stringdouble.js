
var pnds = require('./../persistentds')

pnds.makeStringDoubleMap('testmap', function(m){
	console.log('got m')
	for(var i=0;i<1000*1000;++i){
		m.put('key_'+i, Date.now()+Math.floor(Math.random()*1000))
	}
	console.log('size: ' + m.size())
	console.log('value: ' + m.get('key_0'))
	m.close(function(){
		console.log('got closed callback')
	})
})
