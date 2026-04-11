import{t as e}from"./insforge-D28RsFYD.js";import"./style-BqVZ4CSq.js";import{n as t}from"./notifications-BCNtFL6V.js";var n=null,r=null,i=document.getElementById(`welcome-text`),a=document.getElementById(`logout-btn`),o=document.getElementById(`campaign-form`),s=document.getElementById(`campaigns-container`),c=document.getElementById(`active-count`),l=document.getElementById(`draft-count`),u=document.getElementById(`promotion-creator`),d=document.getElementById(`show-campaign-form-btn`),f=document.getElementById(`cancel-campaign-btn`),p=document.getElementById(`product-name`),m=document.getElementById(`campaign-description`),h=document.getElementById(`budget`),g=document.getElementById(`deadline`),_=document.getElementById(`campaign-msg`);window.addEventListener(`DOMContentLoaded`,async()=>{let{data:t,error:a}=await e.auth.getCurrentUser();if(a||!t?.user){window.location.href=`/brand_auth.html`;return}n=t.user;let{data:s}=await e.database.from(`profiles`).select(`role`).eq(`id`,n.id).single();if(s?.role===`ADMIN`){window.location.href=`/admin_dashboard.html`;return}else if(s?.role===`INFLUENCER`){document.body.innerHTML=`
            <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b0f19; color: white; text-align: center; font-family: sans-serif;">
                <div class="glass-panel" style="padding: 2rem; max-width: 400px; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(22,28,45,0.8);">
                    <h2 style="color: #ef4444; margin-bottom: 1rem;">Influencer Account Detected</h2>
                    <p style="color: #94a3b8; margin-bottom: 2rem;">This account is registered as an Influencer. To use the Brand Portal, please log out and use a Brand account.</p>
                    <div style="display: flex; gap: 1rem; flex-direction: column;">
                        <button id="go-influencer" class="btn btn-primary">Go to Influencer Dashboard</button>
                        <button id="go-logout" class="btn btn-secondary">Log Out & Create Brand Account</button>
                    </div>
                </div>
            </div>
        `,document.getElementById(`go-influencer`).addEventListener(`click`,()=>window.location.href=`/dashboard.html`),document.getElementById(`go-logout`).addEventListener(`click`,async()=>{await e.auth.signOut(),window.location.href=`/brand_auth.html`});return}let{data:c,error:l}=await e.database.from(`brand_profiles_new`).select(`*`).eq(`user_id`,n.id).single();if(!c){window.location.href=`/brand_setup.html`;return}r=c,i.textContent=`Hello, ${r.brand_name}`;let p=()=>{u.style.display=`block`,u.scrollIntoView({behavior:`smooth`})};d.addEventListener(`click`,p),document.getElementById(`nav-campaigns`).addEventListener(`click`,e=>{e.preventDefault(),p()}),f.addEventListener(`click`,()=>{u.style.display=`none`,o.reset(),_.style.display=`none`}),await v()});async function v(){let{data:t,error:r}=await e.database.from(`promotion_requests`).select(`*`).eq(`brand_id`,n.id).order(`created_at`,{ascending:!1});if(r){console.error(`Error loading promotion requests:`,r);return}for(let n of t){let{data:t}=await e.database.from(`tickets`).select(`id`).eq(`promotion_request_id`,n.id);n.hasCollabRequests=t&&t.length>0}y(t)}function y(e){if(!e||e.length===0){s.innerHTML=`<p class="subtitle text-center">No promotion requests created yet.</p>`,c.textContent=`0`,l.textContent=`0`;return}let t=0,n=0;s.innerHTML=``,e.forEach(e=>{e.status===`active`&&t++,e.status===`draft`&&n++;let r=document.createElement(`div`);r.className=`glass-panel mb-4`,r.style.padding=`1.5rem`;let i=(e.platform?e.platform.split(`,`).filter(e=>e!==``):[]).map(e=>`<span class="pill" style="border-color: #8b5cf6; color: #8b5cf6; margin-right: 0.3rem;">${e.toUpperCase()}</span>`).join(``),a=e.status===`active`?`#10b981`:`#f59e0b`;r.innerHTML=`
            <div class="flex-between mb-4">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <h3 style="font-size: 1.25rem;">${e.product_name}</h3>
                    ${i}
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="pill" style="border-color: ${a}; color: ${a};">${e.status.toUpperCase()}</span>
                    ${e.hasCollabRequests?``:`<button class="btn btn-secondary btn-sm" onclick="removeCampaign('${e.id}')" style="padding: 0.25rem 0.5rem; border-color: rgba(239,68,68,0.3); color: #ef4444; background: rgba(239,68,68,0.05);">🗑️</button>`}
                </div>
            </div>
            <p class="subtitle mb-4">${e.description||`No description.`}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.85rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <div>
                   <span style="color: var(--text-muted);">Budget:</span><br/>
                   <strong>${e.budget_min||`N/A`}</strong>
                </div>
                <div>
                   <span style="color: var(--text-muted);">Deadline:</span><br/>
                   <strong>${e.deadline?new Date(e.deadline).toLocaleDateString():`N/A`}</strong>
                </div>
                <div>
                   <span style="color: var(--text-muted);">Created:</span><br/>
                   <strong>${new Date(e.created_at).toLocaleDateString()}</strong>
                </div>
            </div>
        `,s.appendChild(r)}),c.textContent=t,l.textContent=n}window.removeCampaign=async t=>{if(!confirm(`Are you sure you want to delete this promotion request?`))return;let{error:n}=await e.database.from(`promotion_requests`).delete().eq(`id`,t);n?alert(`Error deleting promotion request: `+n.message):await v()},o.addEventListener(`submit`,async t=>{t.preventDefault();let r=document.getElementById(`save-campaign-btn`);r.disabled=!0,r.textContent=`Creating...`,_.style.display=`none`;let i=Array.from(document.querySelectorAll(`input[name="platform"]:checked`)).map(e=>e.value);if(i.length===0){_.textContent=`Please select at least one platform.`,_.className=`subtitle error`,_.style.display=`block`,r.disabled=!1,r.textContent=`Create Promotion Request`;return}let a={brand_id:n.id,product_name:p.value.trim(),description:m.value.trim(),platform:i.join(`,`),budget_min:h.value.trim(),budget_max:``,deadline:g.value,status:`active`};try{let{error:t}=await e.database.from(`promotion_requests`).insert([a]);if(t)throw t;_.textContent=`Promotion request created successfully!`,_.className=`subtitle success`,_.style.display=`block`,setTimeout(async()=>{o.reset(),u.style.display=`none`,_.style.display=`none`,await v()},1500)}catch(e){_.textContent=e.message||`Error occurred`,_.className=`subtitle error`,_.style.display=`block`}finally{r.disabled=!1,r.textContent=`Create Promotion Request`}}),a.addEventListener(`click`,async t=>{t.preventDefault(),await e.auth.signOut(),window.location.href=`/brand_auth.html`}),t();