import{t as e}from"./insforge-D28RsFYD.js";import"./style-BqVZ4CSq.js";import{a as t,c as n,i as r,n as i,o as a,r as o,s,t as c}from"./analytics-8ww5WDR9.js";import{t as l}from"./notifications-C9WghsGK.js";var u=new URLSearchParams(window.location.search).get(`id`),d=null,f=[],p=document.getElementById(`loader`),m=document.getElementById(`profile-view`),h=document.getElementById(`request-modal`),g=document.getElementById(`open-request-modal-btn`),_=document.getElementById(`close-modal-btn`),v=document.getElementById(`collab-request-form`),y=document.getElementById(`request-campaign`),b=document.getElementById(`request-msg`),x=document.getElementById(`logout-btn`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!u){window.location.href=`/discover.html`;return}let{data:t}=await e.auth.getCurrentUser();if(!t?.user){window.location.href=`/brand_auth.html`;return}d=t.user;let{data:n}=await e.database.from(`profiles`).select(`role`).eq(`id`,d.id).single();if(n?.role===`INFLUENCER`&&d.email!==`influencerbrandcollab@gmail.com`){window.location.href=`/index.html`;return}S(),C()});async function S(){let{data:l,error:d}=await e.database.from(`influencer_profiles`).select(`*`).eq(`user_id`,u).single();if(d||!l){p.innerHTML=`<p class="error">Profile not found.</p>`;return}let{data:f,error:h}=await e.database.from(`social_accounts`).select(`*`).eq(`user_id`,u);p.style.display=`none`,m.style.display=`block`,document.getElementById(`profile-name`).textContent=l.name||`Anonymous Creator`,document.getElementById(`profile-avatar`).src=l.avatar_url||`https://via.placeholder.com/120`,document.getElementById(`profile-categories`).textContent=(l.category||[]).join(`, `),document.getElementById(`profile-bio`).textContent=l.bio||`This creator has not added a bio yet.`;let g=t(f||[],l),_=n(g),v=o(f||[]),y=s(v),b=r(f||[]),x=document.createElement(`div`);x.className=`glass-panel mb-8`,x.style.padding=`2rem`,x.innerHTML=`
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
                <p style="font-size: 1.8rem; font-weight: 700; color: #60a5fa;">${(f||[]).length}</p>
                <span class="analytic-badge" style="color: #60a5fa;">${(f||[]).filter(e=>e.verified===!0).length} verified</span>
            </div>
        </div>
    `,m.insertBefore(x,document.getElementById(`channels-grid`));let S=document.getElementById(`channels-grid`);S.innerHTML=``,f&&f.length>0?f.forEach(e=>{let t=document.createElement(`div`);t.className=`glass-panel feature-card`,t.style.padding=`1.5rem`;let n=`#94a3b8`;e.verified===!0&&(n=`#10b981`);let r=i(e),o=c(e),l=s(r);t.innerHTML=`
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
            `,S.appendChild(t)}):S.innerHTML=`<p class="subtitle text-center" style="grid-column: 1/-1;">No social accounts linked.</p>`}async function C(){let{data:t}=await e.database.from(`promotion_requests`).select(`id, product_name`).eq(`brand_id`,d.id).order(`created_at`,{ascending:!1});f=t||[],y.innerHTML=`<option value="">Choose an active promotion request...</option>`,f.forEach(e=>{let t=document.createElement(`option`);t.value=e.id,t.textContent=e.product_name,y.appendChild(t)})}g.addEventListener(`click`,()=>{h.style.display=`block`}),_.addEventListener(`click`,()=>{h.style.display=`none`}),document.getElementById(`cancel-request-btn`)?.addEventListener(`click`,()=>{h.style.display=`none`}),v.addEventListener(`submit`,async t=>{t.preventDefault(),b.style.display=`block`,b.className=`text-center mt-4 mb-2`,b.textContent=`Submitting Request...`;let n=y.value,r=document.getElementById(`request-budget`).value,i=document.getElementById(`request-deadline`).value;try{let t=new Date().toISOString().split(`T`)[0],{data:a}=await e.database.from(`tickets`).select(`id`,{count:`exact`}).eq(`brand_id`,d.id).gte(`created_at`,t);if((a||[]).length>=10)throw Error(`You have reached your daily limit of 10 requests. Please try again tomorrow.`);let{data:o,error:s}=await e.database.from(`tickets`).insert([{brand_id:d.id,influencer_id:u,promotion_request_id:n||null,status:`PENDING`,proposed_amount:r,deadline:i||null}]).select();if(console.log(`Insert result:`,o,s),s)throw s;let c=null;if(o&&o.length>0)c=o[0].id;else{let{data:t}=await e.database.from(`tickets`).select(`id`).eq(`brand_id`,d.id).eq(`influencer_id`,u).order(`created_at`,{ascending:!1}).limit(1);t&&t.length>0&&(c=t[0].id)}let{data:f}=await e.database.from(`brand_profiles_new`).select(`brand_name`).eq(`user_id`,d.id).single(),p=`Direct Deal`;if(n){let{data:t}=await e.database.from(`promotion_requests`).select(`product_name`).eq(`id`,n).single();p=t?.product_name||`Direct Deal`}await l({userId:u,type:`collab_request`,message:`📩 ${f?.brand_name||`A brand`} sent you a collaboration request for "${p}" at ₹${r||`0`}`,referenceId:c}),b.style.color=`#10b981`,b.textContent=`Request Sent Successfully!`,setTimeout(()=>{h.style.display=`none`,v.reset()},1500)}catch(e){b.style.color=`#ef4444`,b.textContent=`Error: `+e.message}}),x.addEventListener(`click`,async t=>{t.preventDefault(),await e.auth.signOut(),window.location.href=`/index.html`});