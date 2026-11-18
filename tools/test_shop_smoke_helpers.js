'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const H=require('./shop_smoke_helpers');
test('Shop browser readiness supports a real basket question separately from money phase',()=>{
 assert.equal(H.ready({round:0,phase:'basket',locked:false},false,0,'basket'),true);
 assert.equal(H.ready({round:0,phase:'basket',locked:false},true,0,'basket'),false);
 assert.equal(H.ready({round:0,phase:'basket',locked:false},false,0,'pay'),false);
});
test('browser audio audit rejects fake shop keys and foreign base-language instructions while allowing target amounts',()=>{
 assert.deepEqual(H.badAudio(['audio/ui/en_lisa_shop_pay.ogg','audio/ui/pt_shop_amt_eur_2.ogg'],'en'),[]);
 assert.deepEqual(H.badAudio(['audio/ui/ru_lisa_shop_pay.ogg','audio/ui/en_mg_shop_help.ogg','audio/pt/r0_q.ogg'],'en'),['audio/ui/ru_lisa_shop_pay.ogg','audio/ui/en_mg_shop_help.ogg','audio/pt/r0_q.ogg']);
});
test('gesture settlement rejects the observed snap-back rect and requires the actual visible hit target',()=>{
 assert.equal(H.settled({attached:true,classes:['mgback','mgdragging'],translate:'-101px -687px',scale:'1.12',hit:false}),false);
 assert.equal(H.settled({attached:true,classes:[],translate:'0px',scale:'1',hit:true}),true);
 assert.equal(H.settled({attached:true,classes:[],translate:'none',scale:'none',hit:false}),false);
 assert.equal(H.settled({attached:true,classes:[],translate:'0px 0px',scale:'1 1',hit:true}),true);
});
