'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {geometryErrors}=require('./smoke_shop_euro5');
const b=(id,x,w=110)=>({id,x,y:0,w,h:110,hit:true});
test('geometry validator accepts touching cells and catches size, overlap, Lisa and occluded targets',()=>{
 assert.deepEqual(geometryErrors([b('a',0),b('b',110)],b('Lisa',230)),[]);
 assert.ok(geometryErrors([b('a',0,109)],null).some(x=>x.includes('110')));
 assert.ok(geometryErrors([b('a',0),b('b',100)],null).some(x=>x.includes('overlap')));
 assert.ok(geometryErrors([b('a',0)],b('Lisa',100)).some(x=>x.includes('Lisa')));
 assert.ok(geometryErrors([{...b('a',0),hit:false}],null).some(x=>x.includes('hit')));
});
