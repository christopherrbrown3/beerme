import { ArrowRight, Beer, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BeerMeMark } from '../components/brand/BeerMeMark';

const steps = [
  {
    title: 'Bring your crew together',
    body: 'Create a group and invite friends with a link or QR code.',
  },
  {
    title: 'Add the moment',
    body: 'Someone covered the coffees, tacos, or next round? Add who owes whom in a few taps.',
  },
  {
    title: 'See whose turn is next',
    body: 'Everyone can see where things stand and how you got there.',
  },
] as const;

export function LandingPage() {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>

      <header className="landing-header">
        <nav className="landing-nav" aria-label="Landing page navigation">
          <Link className="landing-nav__brand" to="/" aria-label="BeerMe home">
            <BeerMeMark />
          </Link>
          <div className="landing-nav__links">
            <a className="landing-nav__how" href="#how-it-works">
              How it works
            </a>
            <Link className="landing-nav__signin" to="/auth/login">
              Sign in
            </Link>
            <Link className="landing-button landing-button--small" to="/auth/signup">
              <span className="landing-button__full-label">Start a group</span>
              <span className="landing-button__compact-label">Start</span>
            </Link>
          </div>
        </nav>
      </header>

      <main id="landing-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <p className="landing-kicker">Made for friends who take turns.</p>
            <h1 id="landing-title">Good friends. Clear tabs.</h1>
            <p className="landing-hero__intro">
              BeerMe remembers the beers, coffees, tacos, and favors friends owe one another—so your
              crew can see whose turn is next.
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-button" to="/auth/signup">
                Start a group
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className="landing-text-link" to="/auth/login">
                I already have an account
              </Link>
            </div>
            <p className="landing-hero__note">Free to use. No payment details needed.</p>
          </div>

          <figure className="landing-example">
            <div className="landing-example__top">
              <div>
                <span className="landing-example__label">Friday Crew</span>
                <strong>A tab everyone can follow</strong>
              </div>
              <div className="landing-example__people" aria-hidden="true">
                <span>C</span>
                <span>A</span>
                <span>M</span>
              </div>
            </div>

            <div className="landing-example__entries">
              <div className="landing-example__round">
                <span className="landing-example__icon" aria-hidden="true">
                  <Beer size={22} />
                </span>
                <div>
                  <strong>
                    Alex <ArrowRight size={13} aria-hidden="true" /> Chris
                  </strong>
                  <span>First round</span>
                </div>
                <b>3 beers</b>
              </div>
              <div className="landing-example__round landing-example__round--returned">
                <span
                  className="landing-example__icon landing-example__icon--returned"
                  aria-hidden="true"
                >
                  <Beer size={22} />
                </span>
                <div>
                  <strong>
                    Chris <ArrowRight size={13} aria-hidden="true" /> Alex
                  </strong>
                  <span>Got the next one</span>
                </div>
                <b>1 beer</b>
              </div>
            </div>

            <div className="landing-example__answer">
              <div>
                <span>Current tab</span>
                <strong>Alex owes Chris</strong>
              </div>
              <b>2 beers</b>
            </div>

            <figcaption>Two rounds later, everyone knows whose turn is next.</figcaption>
          </figure>
        </section>

        <section className="landing-steps" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-section-heading">
            <span className="landing-section-heading__icon" aria-hidden="true">
              <UsersRound size={24} />
            </span>
            <div>
              <h2 id="how-title">Keep it friendly in three quick steps.</h2>
              <p>Beer is just the beginning. Track anything your group takes turns returning.</p>
            </div>
          </div>

          <ol className="landing-step-list">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="landing-step-list__number" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-closing" aria-labelledby="closing-title">
          <div>
            <h2 id="closing-title">Stop keeping score in your head.</h2>
            <p>Start a group, invite your friends, and get back to enjoying the moment.</p>
          </div>
          <Link className="landing-button landing-button--light" to="/auth/signup">
            Start a group
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <BeerMeMark compact />
        <p>Good friends. Clear tabs.</p>
      </footer>
    </div>
  );
}
