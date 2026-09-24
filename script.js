const $ = id => document.getElementById(id);

function num(id){
  const v = $(id).value.trim();
  return v === "" ? null : Number(v);
}

function fmt(v){
  if(!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN",{maximumFractionDigits:2});
}

function timingFactor(rate){
  return $("timing").value === "begin" ? 1 + rate : 1;
}

function fvFromRate(pv,pmt,r,n){
  if(Math.abs(r) < 1e-12) return pv + pmt*n;
  const g = Math.pow(1+r,n);
  return pv*g + pmt*((g-1)/r)*timingFactor(r);
}

function pmtFor(pv,fv,r,n){
  if(Math.abs(r) < 1e-12) return (fv-pv)/n;
  const g = Math.pow(1+r,n);
  return (fv-pv*g)/(((g-1)/r)*timingFactor(r));
}

function solveRate(pv,fv,pmt,n){
  let low=-0.999999, high=1;
  let fLow=fvFromRate(pv,pmt,low,n)-fv;
  let fHigh=fvFromRate(pv,pmt,high,n)-fv;

  for(let k=0;k<60 && fLow*fHigh>0;k++){
    high*=2;
    fHigh=fvFromRate(pv,pmt,high,n)-fv;
    if(high>1000) break;
  }
  if(fLow*fHigh>0) return null;

  for(let i=0;i<150;i++){
    const mid=(low+high)/2;
    const f=fvFromRate(pv,pmt,mid,n)-fv;
    if(Math.abs(f)<1e-8) return mid;
    if(fLow*f<=0){high=mid;fHigh=f}else{low=mid;fLow=f}
  }
  return (low+high)/2;
}

function solvePeriods(pv,fv,pmt,r){
  if(Math.abs(r)<1e-12) return (fv-pv)/pmt;
  let low=0.000001, high=1;
  const f=n=>fvFromRate(pv,pmt,r,n)-fv;
  let fl=f(low), fh=f(high);
  for(let k=0;k<60 && fl*fh>0;k++){high*=2;fh=f(high)}
  if(fl*fh>0) return null;
  for(let i=0;i<150;i++){
    const mid=(low+high)/2, fm=f(mid);
    if(Math.abs(fm)<1e-8) return mid;
    if(fl*fm<=0){high=mid;fh=fm}else{low=mid;fl=fm}
  }
  return (low+high)/2;
}

function calculate(){
  let pv=num("pv"), fv=num("fv"), rate=num("rate"), n=num("periods"), pmt=num("pmt");
  const vals=[pv,fv,rate,n,pmt];
  const missing=vals.filter(v=>v===null).length;
  $("message").textContent="";

  if(missing!==1){
    $("message").textContent="Please enter exactly four values and leave one field empty.";
    return;
  }

  let title="", value="", formula="";

  if(pv===null){
    const r=rate/100;
    if(n===null || rate===null){$("message").textContent="PV needs Interest Rate and Periods.";return}
    if(pmt===null){
      pv=fv/Math.pow(1+r,n);
      formula="PV = FV / (1 + r)ⁿ";
    }else{
      const g=Math.pow(1+r,n);
      pv=(fv-pmt*((g-1)/r)*timingFactor(r))/g;
      formula="PV = [FV − PMT × ((1+r)ⁿ−1)/r × timing factor] / (1+r)ⁿ";
    }
    title="Present Value"; value="₹ "+fmt(pv);
  }else if(fv===null){
    if(rate===null || n===null){$("message").textContent="FV needs Interest Rate and Periods.";return}
    fv=fvFromRate(pv,pmt||0,rate/100,n);
    formula="FV = PV(1+r)ⁿ + PMT[((1+r)ⁿ−1)/r]";
    title="Future Value"; value="₹ "+fmt(fv);
  }else if(pmt===null){
    if(rate===null || n===null){$("message").textContent="PMT needs Interest Rate and Periods.";return}
    pmt=pmtFor(pv,fv,rate/100,n);
    formula="PMT = [FV − PV(1+r)ⁿ] / [((1+r)ⁿ−1)/r]";
    title="Periodic Payment"; value="₹ "+fmt(pmt);
  }else if(rate===null){
    if(n===null){$("message").textContent="Interest Rate needs Number of Periods.";return}
    const r=solveRate(pv,fv,pmt,n);
    if(r===null){$("message").textContent="No numerical interest-rate solution was found for these values.";return}
    rate=r*100;
    formula="Interest rate calculated using numerical bisection solving.";
    title="Interest Rate"; value=fmt(rate)+"%";
  }else if(n===null){
    const r=rate/100;
    if(pmt===null){
      if(pv===0 || fv/pv<=0 || 1+r<=0){$("message").textContent="These values do not produce a valid period.";return}
      n=Math.log(fv/pv)/Math.log(1+r);
      formula="n = log(FV/PV) / log(1+r)";
    }else{
      n=solvePeriods(pv,fv,pmt,r);
      if(n===null){$("message").textContent="No numerical period solution was found for these values.";return}
      formula="Number of periods calculated using numerical bisection solving.";
    }
    title="Number of Periods"; value=fmt(n)+" years";
  }

  $("resultTitle").textContent=title;
  $("resultValue").textContent=value;
  $("formula").textContent=formula;

  $("outPV").textContent=pv===null?"—":"₹ "+fmt(pv);
  $("outFV").textContent=fv===null?"—":"₹ "+fmt(fv);
  $("outRate").textContent=rate===null?"—":fmt(rate)+"%";
  $("outPeriods").textContent=n===null?"—":fmt(n);
  $("outPMT").textContent=pmt===null?"—":"₹ "+fmt(pmt);

  if($("pv").value==="") $("pv").value=pv.toFixed(2);
  if($("fv").value==="") $("fv").value=fv.toFixed(2);
  if($("rate").value==="") $("rate").value=rate.toFixed(4);
  if($("periods").value==="") $("periods").value=n.toFixed(2);
  if($("pmt").value==="") $("pmt").value=pmt.toFixed(2);
}

function reset(){
  ["pv","fv","rate","periods","pmt"].forEach(id=>$(id).value="");
  $("timing").value="end";
  $("resultTitle").textContent="Your Result";
  $("resultValue").textContent="—";
  ["outPV","outFV","outRate","outPeriods","outPMT"].forEach(id=>$(id).textContent="—");
  $("formula").textContent="Enter values and calculate.";
  $("message").textContent="";
}

$("calculate").addEventListener("click",calculate);
$("reset").addEventListener("click",reset);
