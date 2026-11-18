const test=require('node:test'),assert=require('node:assert/strict');
const {options}=require('./capture_opus_lessons');
test('capture selects a single existing lesson, supported viewport and original choice ID',()=>{assert.deepEqual(options(['--lesson=hist_ship','--pick=sailB','--viewport=1920']),{lesson:'hist_ship',pick:'sailB',width:1920,height:1080});assert.equal(options([]).lesson,'repka');for(const a of [['--lesson=no'],['--pick=sailA'],['--viewport=900'],['--lesson=hist_ship','--pick=wall'],['--lesson=more','--lesson=repka']])assert.throws(()=>options(a));});
