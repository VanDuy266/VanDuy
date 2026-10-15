const test=require('node:test'),assert=require('node:assert/strict');
const {resolveSeason}=require('../seasonal');
test('seasonal editorial uses Vietnamese month, supports manual presets and an explicit off switch',()=>{
 assert.equal(resolveSeason({seasonalMode:'auto'},new Date('2026-07-31T18:00:00Z')).key,'school');
 assert.equal(resolveSeason({seasonalMode:'auto'},new Date('2026-02-01T00:00:00Z')).key,'tet');
 assert.equal(resolveSeason({seasonalMode:'auto'},new Date('2026-06-01T00:00:00Z')).key,'summer');
 assert.equal(resolveSeason({seasonalMode:'auto'},new Date('2026-10-16T00:00:00Z')).key,'showroom');
 assert.equal(resolveSeason({seasonalMode:'school'},new Date('2026-10-16')).key,'school');
 assert.equal(resolveSeason({seasonalMode:'off'}),null);assert.equal(resolveSeason({showEditorial:false}),null);
 for(const mode of ['showroom','school','tet','summer']){const s=resolveSeason({seasonalMode:mode});assert.ok(s.image&&s.cta&&s.link);assert.equal(s.ends,undefined);assert.doesNotMatch(s.description,/giảm\s+\d|0%|miễn phí/);}
});
