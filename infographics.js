// infographics.js
function ensureChartJs(cb){
  if(window.Chart) return cb();
  const s=document.createElement('script');
  s.src="https://cdn.jsdelivr.net/npm/chart.js";
  s.onload=cb;
  document.head.appendChild(s);
}
function parseScoreRaw(str){
  const m=String(str||"").trim().match(/(\d+)/);
  return m?parseInt(m[1]):0;
}
function loadInfographics(){
  const container=document.getElementById('infographics-container');
  container.innerHTML="লোড হচ্ছে...";
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!${API_RANGE}?key=${API_KEY}`;
  fetch(url).then(r=>r.json()).then(data=>{
    const rows=data.values; if(!rows||rows.length<=1){container.innerHTML="ডেটা নেই"; return;}
    const scores=[]; rows.slice(1).forEach(r=>scores.push(parseScoreRaw(r[2])));
    const total=scores.length;
    const below20=scores.filter(s=>s<20).length;
    const above20=scores.filter(s=>s>=20).length;
    const full30=scores.filter(s=>s===30).length;
    const prize=Math.min(3,total);

    // build HTML
    container.innerHTML=`
      <div class="infographics-wrapper">
        <div class="infographics-left">
          <canvas id="wheel" class="compact-wheel"></canvas>
          <div class="metrics-list" id="metrics"></div>
        </div>
        <div class="infographics-right">
          <canvas id="tierChart"></canvas>
          <div id="tierLegend"></div>
        </div>
      </div>
    `;
    ensureChartJs(()=>{
      // wheel
      new Chart(document.getElementById('wheel'),{
        type:'doughnut',
        data:{labels:['২০ এর কম','২০ বা তার বেশি'],
          datasets:[{data:[below20,above20],backgroundColor:['#e74c3c','#3498db']}]},
        options:{responsive:true,plugins:{legend:{position:'bottom'}}}
      });
      // metrics
      const metricsEl=document.getElementById('metrics');
      const add=(label,count,color)=>{const pct=((count/total)*100).toFixed(1);
        metricsEl.innerHTML+=`<div class="metric-card" style="border-left:5px solid ${color}"><strong>${label}</strong>: ${count} (${pct}%)</div>`;
      }
      add("পুরস্কারপ্রাপ্ত",prize,"#f1c40f");
      add("পূর্ণ ৩০",full30,"#1abc9c");
      add("২০ এর কম",below20,"#e74c3c");
      add("২০ বা তার বেশি",above20,"#3498db");

      // 5-tier
      const buckets=[0,0,0,0,0];
      scores.forEach(s=>{
        if(s>=25) buckets[0]++;
        else if(s>=20) buckets[1]++;
        else if(s>=15) buckets[2]++;
        else if(s>=10) buckets[3]++;
        else buckets[4]++;
      });
      const labels=['২৫–৩০: ভালো','২০–২৪: সচেতন','১৫–১৯: পড়াশোনা বাড়াতে হবে','১০–১৪: উদাসীন','<১০: মারাত্মক কম'];
      const colors=['#2ecc71','#3498db','#f39c12','#e67e22','#e74c3c'];
      new Chart(document.getElementById('tierChart'),{
        type:'bar',
        data:{labels:labels,datasets:[{data:buckets,backgroundColor:colors}]},
        options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}}}
      });
      const legendEl=document.getElementById('tierLegend');
      labels.forEach((lab,i)=>{legendEl.innerHTML+=`<div><span style="display:inline-block;width:12px;height:12px;background:${colors[i]}"></span> ${lab}: ${buckets[i]} (${((buckets[i]/total)*100).toFixed(1)}%)</div>`});
    });
  });

}
document.addEventListener('DOMContentLoaded',loadInfographics);





document.addEventListener("DOMContentLoaded", function(){

  // ==== Individual based ====
  const individualData = {
    labels: ["আলিয়া মাদরাসা", "স্কুল-কলেজ", "কওমি মাদরাসা"],
    datasets: [{
      label: "অংশগ্রহণকারীর সংখ্যা",
      data: [9, 6, 26],  // এখানে ডুপ্লিকেট বাদ নাই
      backgroundColor: ["#3498db","#f39c12","#2ecc71"]
    }]
  };

  new Chart(document.getElementById("chartIndividual"), {
    type: 'doughnut',
    data: individualData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(ctx){
              let total = ctx.chart._metasets[ctx.datasetIndex].total;
              let val = ctx.parsed;
              let pct = ((val/total)*100).toFixed(1);
              return `${ctx.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });


  // ==== Institution based (Unique persons) ====
  const institutionData = {
    labels: ["আলিয়া মাদরাসা", "স্কুল-কলেজ", "কওমি মাদরাসা"],
    datasets: [{
      label: "Unique অংশগ্রহণকারী",
      data: [9, 5, 25], // এখানে ডুপ্লিকেট বাদ দেওয়া হয়েছে
      backgroundColor: ["#2980b9","#e67e22","#27ae60"]
    }]
  };

  new Chart(document.getElementById("chartInstitution"), {
    type: 'doughnut',
    data: institutionData,
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: function(ctx){
              let total = ctx.chart._metasets[ctx.datasetIndex].total;
              let val = ctx.parsed;
              let pct = ((val/total)*100).toFixed(1);
              return `${ctx.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });

});
