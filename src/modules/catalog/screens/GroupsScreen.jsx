import React from 'react';

// Groups management — for assigning products to modifier and meal-deal groups
const GroupsScreen = ({ kind }) => {
  const { DATA, I, DEAL_GROUPS, PRODUCT_GROUPS, DEAL_PRODUCTS } = window;
  const groups = kind === 'deals' ? DEAL_GROUPS : DATA.modifierGroups;
  const [sel, setSel] = React.useState(groups[0]);

  // products linked to this group
  const linkedProducts = React.useMemo(() => {
    if (!sel) return [];
    const key = kind === 'deals' ? 'dealGroups' : 'modGroups';
    return Object.entries(PRODUCT_GROUPS)
      .filter(([_, g]) => (g[key] || []).includes(sel.id))
      .map(([pid]) => [...DATA.products, ...DEAL_PRODUCTS].find(p => p.id === pid))
      .filter(Boolean);
  }, [sel, kind, DATA.products, DEAL_PRODUCTS, PRODUCT_GROUPS]);

  return (
    <div>
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{kind === 'deals' ? 'Meal Deal Groups' : 'Modifier Groups'}</h1>
          <p className="page-sub">
            {kind === 'deals'
              ? 'Bundles with min/max sub-product rules. Link a deal-trigger product to a group; cart opens the builder when added.'
              : 'Reusable customization sets (cooking, milk, toppings). Attach to many products; cart applies min/max rules at add-time.'}
          </p>
        </div>
        <button className="btn btn-sm"><I.Plus size={11}/> New {kind === 'deals' ? 'deal group' : 'modifier group'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          {groups.map(g => {
            const active = sel?.id === g.id;
            return (
              <div key={g.id} onClick={() => setSel(g)}
                style={{
                  padding: 12, borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: active ? 'var(--surface-2)' : 'transparent',
                  borderLeft: active ? '2px solid var(--ink)' : '2px solid transparent',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{g.id}</div>
                  </div>
                  {kind === 'deals'
                    ? <span className="chip">${g.dealPrice?.toFixed(2)}</span>
                    : g.required ? <span className="chip chip-info">Required</span> : <span className="chip">Optional</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                  {kind === 'deals'
                    ? <>{g.subProducts.length} sub-groups · {g.available}</>
                    : <>min {g.min} · max {g.max} · {g.items?.length || 0} items</>}
                </div>
              </div>
            );
          })}
        </div>
        {sel && <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{sel.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{sel.id}</div>
            </div>
            <div style={{ flex: 1 }}/>
            <button className="btn btn-sm"><I.Edit size={11}/> Edit</button>
          </div>

          {kind === 'deals' ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Sub-product groups</div>
              {sel.subProducts.map((s, i) => (
                <div key={i} className="card" style={{ padding: 12, marginBottom: 8, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)', color: '#fff', fontSize: 10, fontWeight: 600, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.groupName}</div>
                    <span className="chip">{s.min === s.max ? `Pick ${s.min}` : `Pick ${s.min}–${s.max}`}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.options.map(o => (
                      <span key={o.id} className="chip" style={{ fontSize: 11 }}>
                        {o.name}{o.upcharge > 0 && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}> +${o.upcharge.toFixed(2)}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <Stat2 k="Min" v={sel.min}/>
                <Stat2 k="Max" v={sel.max}/>
                <Stat2 k="Required" v={sel.required ? 'Yes' : 'No'}/>
                <Stat2 k="Items" v={sel.items?.length || 0}/>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Items</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {(sel.items || []).map((item, i) => (
                  <span key={i} className="chip" style={{ fontSize: 11 }}>{item}</span>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Linked products</div>
              <span className="chip">{linkedProducts.length}</span>
              <div style={{ flex: 1 }}/>
              <button className="btn btn-sm"><I.Plus size={11}/> Link product</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
              {linkedProducts.map(p => (
                <div key={p.id} style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: 'var(--surface-2)', borderRadius: 4, display: 'grid', placeItems: 'center' }}>
                    <I.Box size={13}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{p.id}</div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm"><I.X size={11}/></button>
                </div>
              ))}
              {linkedProducts.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>No products linked yet.</div>}
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
};

const Stat2 = ({ k, v }) => (
  <div style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 5 }}>
    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</div>
    <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{v}</div>
  </div>
);

export default GroupsScreen;
