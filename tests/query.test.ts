import test from 'node:test';
import assert from 'node:assert/strict';
import {filterExperiments,csvForExperiments} from '../src/lab/query.ts';
import type {Experiment} from '../src/lab/model.ts';
const records=[{id:'EXP-1',name:'Signup, "simplified"',stage:'Activation',status:'Running',owner:'Maya',metric:'Signup',tags:['UX'],visitors:100,uplift:4,confidence:95,traffic:50},{id:'EXP-2',name:'Pricing',stage:'Monetization',status:'Review',owner:'Anuj',metric:'Revenue',tags:['Paid'],visitors:50,uplift:8,confidence:99,traffic:25}] as Experiment[];
test('filters combine search, stage, status, and owner without changing data',()=>{const result=filterExperiments(records,{query:' ux ',stage:'Activation',statuses:['Running'],owners:['Maya']});assert.equal(result.length,1);assert.equal(result[0].id,'EXP-1');assert.equal(filterExperiments(records,{query:'',stage:'All',statuses:['Review'],owners:['Maya']}).length,0);assert.equal(records.length,2);});
test('CSV safely quotes commas and embedded quotes',()=>{assert.match(csvForExperiments(records),/"Signup, ""simplified"""/);assert.equal(csvForExperiments([]).split('\r\n').length,1);});
