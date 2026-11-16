/** Pricing components, driven entirely by the offer catalog. */
import { addOnPrice, usd } from '../../../03-Offers-and-Pricing/format.ts';
import { addOns } from '../../../03-Offers-and-Pricing/offer-catalog.ts';
import type { Offer } from '../../../03-Offers-and-Pricing/types.ts';
import { CheckList, CtaLink, Icon } from './ui.tsx';

export function PriceLine({ offer, size = 'md' }: { offer: Offer; size?: 'md' | 'lg' }) {
  return (
    <p className={`price price--${size}`} data-price={`${offer.price.setup}/${offer.price.monthly}`}>
      <span className="price__monthly">{usd(offer.price.monthly)}<small>/mo</small></span>
      <span className="price__setup">+ {usd(offer.price.setup)} one-time setup</span>
    </p>
  );
}

export function PricingCard({ offer, featured = false, detailHref }: { offer: Offer; featured?: boolean; detailHref?: string }) {
  return (
    <article className={`pcard${featured ? ' pcard--featured' : ''}`} id={offer.id} aria-labelledby={`${offer.id}-name`}>
      {featured ? <p className="pcard__flag">Complete system</p> : null}
      <p className="pcard__stage">{offer.stage}</p>
      <h3 id={`${offer.id}-name`}>{offer.name}</h3>
      <p className="pcard__tag">{offer.tagline}</p>
      <PriceLine offer={offer} />
      <CheckList items={offer.services} />
      {offer.cost.passThrough ? <p className="pcard__note"><Icon name="clock" size={15} /> {offer.cost.passThrough}</p> : null}
      <div className="pcard__actions">
        <CtaLink href={`/free-snapshot/?interest=${offer.id}`} variant={featured ? 'primary' : 'secondary'} cta={`pricing-${offer.code}`}>Start with a free Snapshot</CtaLink>
        {detailHref ? <a className="link-arrow" href={detailHref}>Service details <Icon name="arrow" size={16} /></a> : null}
      </div>
    </article>
  );
}

export function AddOnTable() {
  return (
    <div className="table-wrap">
      <table className="addons">
        <caption className="sr-only">Add-ons</caption>
        <thead><tr><th scope="col">Add-on</th><th scope="col">What it is</th><th scope="col">Price</th></tr></thead>
        <tbody>
          {addOns.map((a) => (
            <tr key={a.id}>
              <th scope="row">{a.name}</th>
              <td>{a.summary}</td>
              <td className="addons__price">{addOnPrice(a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
