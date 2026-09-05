import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBenefitCompatibility } from "./evaluate.ts";

const sourceUrl = "https://www.gov.br/aneel/pt-br/assuntos/tarifas/tarifa-social";
const base = { benefitId:"tsee", groupOperator:"and", sourceUrl, verifiedAt:"2026-09-04", effectiveFrom:"2026-01-01", effectiveTo:"2026-12-31", ruleVersion:1, isActive:true };
const c = (id, routeKey, criterionKey, operator, expectedValue, groupKey, groupOperator="and", importance="required") => ({ ...base,id,ruleKey:id,routeKey,criterionKey,operator,expectedValue,groupKey,groupOperator,importance,matchMessage:`${id} atende.`,unknownMessage:`Falta ${id}.`,mismatchMessage:`${id} não atende.` });
const criteria = [
  c("low-cad","cadunico_low_income","cadunico_status","equals","yes","low"),
  c("low-income","cadunico_low_income","per_capita_income","less_than_or_equal",810.5,"low-income","and","supporting"),
  c("med-cad","medical_equipment","cadunico_status","equals","yes","medical"),
  c("med-income","medical_equipment","household_monthly_income","less_than_or_equal",4863,"med-income","and","supporting"),
  c("med-disability","medical_equipment","disability","is_true",true,"health","or"),
  c("bpc-age","bpc_recipient","age","greater_than_or_equal",65,"bpc-person","or"),
  c("bpc-disability","bpc_recipient","disability","is_true",true,"bpc-person","or"),
];
const v = (id,routeKey,groupKey=null,groupOperator=null) => ({ ...base,id,verificationKey:id,routeKey,groupKey,groupOperator,message:`Confirmar ${id}.` });
const verifications = [
  v("official-low-income","cadunico_low_income"),v("low-current","cadunico_low_income"),
  v("disease","medical_equipment","health","or"),v("official-med-income","medical_equipment"),v("equipment","medical_equipment"),
  v("bpc-receipt","bpc_recipient"),v("residential","common"),v("single-unit","common"),v("address","common"),
];
const asOf = new Date("2026-09-04T12:00:00Z");
const evaluate = (profile,date=asOf) => evaluateBenefitCompatibility({profile,criteria,verifications,asOf:date});
const route = (result,key) => result.routeEvaluations.find(item=>item.routeKey===key)?.status;

test("A: CadUnico and compatible low-income estimate keep low-income route possible",()=>{const r=evaluate({cadunicoStatus:"yes",householdMonthlyIncome:1600,householdSize:4,ageYears:30,conditions:[]});assert.equal(route(r,"cadunico_low_income"),"verification_required");assert.equal(r.level,"possible");});
test("B: absent CadUnico produces needs_information",()=>assert.equal(evaluate({ageYears:30,conditions:[]}).level,"needs_information"));
test("C and N: explicit no CadUnico plus rejected BPC signals can honestly produce low",()=>{const r=evaluate({cadunicoStatus:"no",ageYears:30,conditions:[]});assert.equal(route(r,"cadunico_low_income"),"rejected");assert.equal(route(r,"medical_equipment"),"rejected");assert.equal(route(r,"bpc_recipient"),"rejected");assert.equal(r.level,"low");});
test("D: high household estimate is supporting and cannot reject low-income route",()=>assert.equal(route(evaluate({cadunicoStatus:"yes",householdMonthlyIncome:9000,householdSize:1,ageYears:30,conditions:[]}),"cadunico_low_income"),"verification_required"));
test("E: disability and compatible income require equipment verification",()=>{const r=evaluate({cadunicoStatus:"yes",householdMonthlyIncome:3000,householdSize:2,ageYears:30,conditions:["disability"]});assert.equal(route(r,"medical_equipment"),"verification_required");assert.ok(r.verificationExplanations.some(x=>x.verificationKey==="equipment"));});
test("F: no disability leaves disease alternative indeterminate when medical core matches",()=>assert.equal(route(evaluate({cadunicoStatus:"yes",householdMonthlyIncome:3000,householdSize:2,ageYears:30,conditions:[]}),"medical_equipment"),"indeterminate"));
test("G and L: missing disability plus missing inputs follows needs_information precedence",()=>assert.equal(evaluate({cadunicoStatus:null,conditions:null}).level,"needs_information"));
test("H: age 65 makes BPC route pertinent but receipt remains external",()=>assert.equal(route(evaluate({cadunicoStatus:"no",ageYears:70,conditions:[]}),"bpc_recipient"),"verification_required"));
test("I: disability makes BPC route pertinent but receipt remains external",()=>assert.equal(route(evaluate({cadunicoStatus:"no",ageYears:30,conditions:["disability"]}),"bpc_recipient"),"verification_required"));
test("J: under 65 and no disability rejects BPC route",()=>assert.equal(route(evaluate({cadunicoStatus:"no",ageYears:30,conditions:[]}),"bpc_recipient"),"rejected"));
test("M: verification_required takes precedence over indeterminate",()=>{const r=evaluate({cadunicoStatus:"yes",ageYears:70,conditions:[]});assert.equal(route(r,"bpc_recipient"),"verification_required");assert.equal(r.level,"possible");});
test("O: expired rules return unstructured",()=>assert.equal(evaluate({cadunicoStatus:"yes",ageYears:70,conditions:[]},new Date("2027-01-01T00:00:00Z")).level,"unstructured"));
