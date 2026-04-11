import{t as e}from"./insforge-gvpOEqFn.js";import"./style-BMUfA7TY.js";var t=null,n=null,r=document.getElementById(`welcome-text`),i=document.getElementById(`logout-btn`),a=document.getElementById(`campaign-form`),o=document.getElementById(`campaigns-container`),s=document.getElementById(`active-count`),c=document.getElementById(`draft-count`),l=document.getElementById(`promotion-creator`),u=document.getElementById(`show-campaign-form-btn`),d=document.getElementById(`cancel-campaign-btn`),f=document.getElementById(`product-name`),p=document.getElementById(`campaign-description`),m=document.getElementById(`budget`),h=document.getElementById(`deadline`),g=document.getElementById(`campaign-msg`);window.addEventListener(`DOMContentLoaded`,async()=>{let{data:i,error:o}=await e.auth.getCurrentUser();if(o||!i?.user){window.location.href=`/brand_auth.html`;return}t=i.user;let{data:s}=await e.database.from(`profiles`).select(`role`).eq(`id`,t.id).single();if(s?.role===`ADMIN`){window.location.href=`/admin_dashboard.html`;return}else if(s?.role===`INFLUENCER`){document.body.innerHTML=`
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
        `,document.getElementById(`go-influencer`).addEventListener(`click`,()=>window.location.href=`/dashboard.html`),document.getElementById(`go-logout`).addEventListener(`click`,async()=>{await e.auth.signOut(),window.location.href=`/brand_auth.html`});return}let{data:c,error:f}=await e.database.from(`brand_profiles_new`).select(`*`).eq(`user_id`,t.id).single();if(!c){window.location.href=`/brand_setup.html`;return}n=c,r.textContent=`Hello, ${n.brand_name}`;let p=()=>{l.style.display=`block`,l.scrollIntoView({behavior:`smooth`})};u.addEventListener(`click`,p),document.getElementById(`nav-campaigns`).addEventListener(`click`,e=>{e.preventDefault(),p()}),d.addEventListener(`click`,()=>{l.style.display=`none`,a.reset(),g.style.display=`none`}),await _()});async function _(){let{data:n,error:r}=await e.database.from(`promotion_requests`).select(`*`).eq(`brand_id`,t.id).order(`created_at`,{ascending:!1});if(r){console.error(`Error loading promotion requests:`,r);return}for(let t of n){let{data:n}=await e.database.from(`tickets`).select(`id`).eq(`promotion_request_id`,t.id);t.hasCollabRequests=n&&n.length>0}v(n)}function v(e){if(!e||e.length===0){o.innerHTML=`<p class="subtitle text-center">No promotion requests created yet.</p>`,s.textContent=`0`,c.textContent=`0`;return}let t=0,n=0;o.innerHTML=``,e.forEach(e=>{e.status===`active`&&t++,e.status===`draft`&&n++;let r=document.createElement(`div`);r.className=`glass-panel mb-4`,r.style.padding=`1.5rem`;let i=(e.platform?e.platform.split(`,`).filter(e=>e!==``):[]).map(e=>`<span class="pill" style="border-color: #8b5cf6; color: #8b5cf6; margin-right: 0.3rem;">${e.toUpperCase()}</span>`).join(``),a=e.status===`active`?`#10b981`:`#f59e0b`;r.innerHTML=`
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
        `,o.appendChild(r)}),s.textContent=t,c.textContent=n}window.removeCampaign=async t=>{if(!confirm(`Are you sure you want to delete this promotion request?`))return;let{error:n}=await e.database.from(`promotion_requests`).delete().eq(`id`,t);n?alert(`Error deleting promotion request: `+n.message):await _()},a.addEventListener(`submit`,async n=>{n.preventDefault();let r=document.getElementById(`save-campaign-btn`);r.disabled=!0,r.textContent=`Creating...`,g.style.display=`none`;let i=Array.from(document.querySelectorAll(`input[name="platform"]:checked`)).map(e=>e.value);if(i.length===0){g.textContent=`Please select at least one platform.`,g.className=`subtitle error`,g.style.display=`block`,r.disabled=!1,r.textContent=`Create Promotion Request`;return}let o={brand_id:t.id,product_name:f.value.trim(),description:p.value.trim(),platform:i.join(`,`),budget_min:m.value.trim(),budget_max:``,deadline:h.value,status:`active`};try{let{error:t}=await e.database.from(`promotion_requests`).insert([o]);if(t)throw t;g.textContent=`Promotion request created successfully!`,g.className=`subtitle success`,g.style.display=`block`,setTimeout(async()=>{a.reset(),l.style.display=`none`,g.style.display=`none`,await _()},1500)}catch(e){g.textContent=e.message||`Error occurred`,g.className=`subtitle error`,g.style.display=`block`}finally{r.disabled=!1,r.textContent=`Create Promotion Request`}}),i.addEventListener(`click`,async t=>{t.preventDefault(),await e.auth.signOut(),window.location.href=`/brand_auth.html`});