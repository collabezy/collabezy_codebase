import{t as e}from"./insforge-gvpOEqFn.js";import"./style-BMUfA7TY.js";import{a as t,c as n,i as r,n as i,o as a,r as o,s,t as c}from"./analytics-Cw2uiPP8.js";var l=new URLSearchParams(window.location.search).get(`id`),u=null,d=[],f=document.getElementById(`loader`),p=document.getElementById(`profile-view`),m=document.getElementById(`request-modal`),h=document.getElementById(`open-request-modal-btn`),g=document.getElementById(`close-modal-btn`),_=document.getElementById(`collab-request-form`),v=document.getElementById(`request-campaign`),y=document.getElementById(`request-msg`),b=document.getElementById(`logout-btn`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!l){window.location.href=`/discover.html`;return}let{data:t}=await e.auth.getCurrentUser();if(!t?.user){window.location.href=`/brand_auth.html`;return}u=t.user;let{data:n}=await e.database.from(`profiles`).select(`role`).eq(`id`,u.id).single();if(n?.role===`INFLUENCER`&&u.email!==`influencerbrandcollab@gmail.com`){window.location.href=`/index.html`;return}x(),S()});async function x(){let{data:u,error:d}=await e.database.from(`influencer_profiles`).select(`*`).eq(`user_id`,l).single();if(d||!u){f.innerHTML=`<p class="error">Profile not found.</p>`;return}let{data:m,error:h}=await e.database.from(`social_accounts`).select(`*`).eq(`user_id`,l);f.style.display=`none`,p.style.display=`block`,document.getElementById(`profile-name`).textContent=u.name||`Anonymous Creator`,document.getElementById(`profile-avatar`).src=u.avatar_url||`https://via.placeholder.com/120`,document.getElementById(`profile-categories`).textContent=(u.category||[]).join(`, `),document.getElementById(`profile-bio`).textContent=u.bio||`This creator has not added a bio yet.`;let g=t(m||[],u),_=n(g),v=o(m||[]),y=s(v),b=r(m||[]),x=document.createElement(`div`);x.className=`glass-panel mb-8`,x.style.padding=`2rem`,x.innerHTML=`
        <h2 class="mb-4">Analytics Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Total Followers</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: #a78bfa;">${a(b)}</p>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Engagement Rate</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: ${y.color};">
                    ${v===null?`N/A`:v.toFixed(2)+`%`}
                </p>
                <span class="analytic-badge" style="color: ${y.color};">${y.label}</span>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Trust Score</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: ${_.color};">${g}/100</p>
                <span class="analytic-badge" style="color: ${_.color};">${_.emoji} ${_.label}</span>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Channels</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: #60a5fa;">${(m||[]).length}</p>
                <span class="analytic-badge" style="color: #60a5fa;">${(m||[]).filter(e=>e.verified===!0).length} verified</span>
            </div>
        </div>
    `,p.insertBefore(x,document.getElementById(`channels-grid`));let S=document.getElementById(`channels-grid`);S.innerHTML=``,m&&m.length>0?m.forEach(e=>{let t=document.createElement(`div`);t.className=`glass-panel feature-card`,t.style.padding=`1.5rem`;let n=`#94a3b8`;e.verified===!0&&(n=`#10b981`);let r=i(e),o=c(e),l=s(r);t.innerHTML=`
                <div class="flex-between mb-4">
                    <h3 style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">${e.platform}</h3>
                    <span class="pill" style="border-color: ${n}; color: ${n}; font-size: 0.75rem;">${e.verified?`VERIFIED`:`PENDING`}</span>
                </div>
                <h4 style="font-size: 1.25rem;">${e.channel_name}</h4>
                <p class="subtitle mb-4">${a(e.followers)} followers</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Engagement</p>
                        <p style="font-weight: bold; color: ${l.color};">
                            ${r===null?`N/A`:r.toFixed(2)+`%`}
                        </p>
                    </div>
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Avg Views</p>
                        <p style="font-weight: bold; color: #60a5fa;">
                            ${o===null?`N/A`:a(o)}
                        </p>
                    </div>
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Platform</p>
                        <p style="font-weight: bold; color: #c4b5fd;">
                            ${e.platform.toUpperCase()}
                        </p>
                    </div>
                </div>
            `,S.appendChild(t)}):S.innerHTML=`<p class="subtitle text-center" style="grid-column: 1/-1;">No social accounts linked.</p>`}async function S(){let{data:t}=await e.database.from(`promotion_requests`).select(`id, product_name`).eq(`brand_id`,u.id).order(`created_at`,{ascending:!1});d=t||[],v.innerHTML=`<option value="">Choose an active promotion request...</option>`,d.forEach(e=>{let t=document.createElement(`option`);t.value=e.id,t.textContent=e.product_name,v.appendChild(t)})}h.addEventListener(`click`,()=>{m.style.display=`block`}),g.addEventListener(`click`,()=>{m.style.display=`none`}),document.getElementById(`cancel-request-btn`)?.addEventListener(`click`,()=>{m.style.display=`none`}),_.addEventListener(`submit`,async t=>{t.preventDefault(),y.style.display=`block`,y.className=`text-center mt-4 mb-2`,y.textContent=`Submitting Request...`;let n=v.value,r=document.getElementById(`request-budget`).value,i=document.getElementById(`request-deadline`).value;try{let t=new Date().toISOString().split(`T`)[0],{data:a}=await e.database.from(`tickets`).select(`id`,{count:`exact`}).eq(`brand_id`,u.id).gte(`created_at`,t);if((a||[]).length>=10)throw Error(`You have reached your daily limit of 10 requests. Please try again tomorrow.`);let{error:o}=await e.database.from(`tickets`).insert([{brand_id:u.id,influencer_id:l,promotion_request_id:n||null,status:`PENDING`,proposed_amount:r,deadline:i||null}]);if(o)throw o;y.style.color=`#10b981`,y.textContent=`Request Sent Successfully!`,setTimeout(()=>{m.style.display=`none`,_.reset()},1500)}catch(e){y.style.color=`#ef4444`,y.textContent=`Error: `+e.message}}),b.addEventListener(`click`,async t=>{t.preventDefault(),await e.auth.signOut(),window.location.href=`/index.html`});