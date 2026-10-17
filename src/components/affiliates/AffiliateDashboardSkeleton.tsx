import s from './approved-affiliate.module.css';
import k from './affiliate-skeleton.module.css';

function Line({ wide = false }: { wide?: boolean }) {
  return <div className={`${k.shimmer} ${k.line} ${wide ? k.wide : ''}`} />;
}

export function AffiliateOverviewSkeleton() {
  return <div aria-busy="true" aria-label="Carregando indicadores do afiliado">
    <span className="sr-only" role="status">Carregando indicadores…</span>
    <div aria-hidden="true">
      <div className={s.kpis}>{Array.from({ length: 4 }, (_, i) => <div className={`${s.card} ${s.kpi}`} key={i}>
        <div className={`${k.shimmer} ${k.icon}`} /><Line wide /><div className={`${k.shimmer} ${k.value}`} />
      </div>)}</div>
      <div className={s.gridTwo}>{[0, 1].map(i => <div className={`${s.card} ${s.pad}`} key={i}>
        <div className={`${k.shimmer} ${k.heading}`} /><Line wide />
        <div className={k.chart}>{[0, 1, 2].map(j => <Line key={j} wide />)}</div>
        <Line wide />
      </div>)}</div>
    </div>
  </div>;
}

export function AffiliateDashboardSkeleton() {
  return <main className={s.page} aria-busy="true" aria-label="Carregando painel de afiliado">
    <span className="sr-only" role="status">Carregando painel de afiliado…</span>
    <div className={`${s.blob} ${s.blobOne}`} aria-hidden="true" /><div className={`${s.blob} ${s.blobTwo}`} aria-hidden="true" />
    <div className={s.wrap}>
      <div className={s.top} aria-hidden="true"><div className={k.titleGroup}><Line /><div className={`${k.shimmer} ${k.title}`} /></div><div className={s.badges}><div className={`${k.shimmer} ${k.badge}`} /><div className={`${k.shimmer} ${k.badge}`} /></div></div>
      <div className={`${s.card} ${s.hero}`} aria-hidden="true">
        <div className={s.lv}><div className={`${k.shimmer} ${k.ring}`} /><div className={k.level}><Line /><div className={`${k.shimmer} ${k.heading}`} /><div className={`${k.shimmer} ${k.badge}`} /><Line wide /></div></div>
        <div className={s.steps}>{[0, 1, 2, 3].map(i => <div className={s.step} key={i}><div className={`${s.dot} ${k.shimmer}`} /><Line wide /><Line /></div>)}</div>
        <div className={s.message}><Line wide /></div>
      </div>
      <div className={`${s.tabs} ${k.tabs}`} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div className={`${k.shimmer} ${k.tab}`} key={i} />)}</div>
      <AffiliateOverviewSkeleton />
    </div>
  </main>;
}
