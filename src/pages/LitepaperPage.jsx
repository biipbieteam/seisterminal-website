import "./LitepaperPage.css";

function LitepaperPage() {
  return (
    <div className="litepaper-page">
      <aside className="litepaper-index">
        <div className="litepaper-index-title">
          LITEPAPER_
        </div>

        <nav>
          <a href="#abstract">
            <span>01</span>
            ABSTRACT
          </a>

          <a href="#principles">
            <span>02</span>
            DESIGN PRINCIPLES
          </a>

          <a href="#overview">
            <span>03</span>
            PROTOCOL OVERVIEW
          </a>

          <a href="#economics">
            <span>04</span>
            FAIR LAUNCH ECONOMICS
          </a>

          <a href="#curve">
            <span>05</span>
            BONDING CURVE
          </a>

          <a href="#graduation">
            <span>06</span>
            GRADUATION
          </a>

          <a href="#architecture">
            <span>07</span>
            ARCHITECTURE
          </a>

          <a href="#security">
            <span>08</span>
            SECURITY MODEL
          </a>

          <a href="#risks">
            <span>09</span>
            RISKS
          </a>

          <a href="#future">
            <span>10</span>
            FUTURE DEVELOPMENT
          </a>
        </nav>
      </aside>


      <main className="litepaper-content">

        {/* COVER */}

        <section className="litepaper-cover">
          <div className="litepaper-breadcrumb">
            SEIS TERMINAL / LITEPAPER / v1.0_
          </div>

          <span className="litepaper-version">
            PROTOCOL LITEPAPER / v1.0
          </span>

          <h1>
            SEIS TERMINAL
            <br />
            LITEPAPER_
          </h1>

          <p className="litepaper-lead">
            A lightweight token launch and trading
            protocol built around deterministic
            Fair Launch mechanics, transparent
            pricing, and permissionless graduation.
          </p>

          <div className="litepaper-cover-meta">
            <div>
              <span>
                NETWORK
              </span>

              <strong>
                ARC TESTNET
              </strong>
            </div>

            <div>
              <span>
                PROTOCOL
              </span>

              <strong>
                FAIR LAUNCH
              </strong>
            </div>

            <div>
              <span>
                VERSION
              </span>

              <strong>
                v1.0
              </strong>
            </div>
          </div>
        </section>


        {/* 01 ABSTRACT */}

        <section
          className="litepaper-section"
          id="abstract"
        >
          <div className="litepaper-section-number">
            01
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              ABSTRACT
            </span>

            <h2>
              Launching and trading should not
              require unnecessary complexity.
            </h2>

            <p>
              SEIS TERMINAL is a token launch and
              trading protocol designed around a
              simple lifecycle: create a token,
              distribute it through a predefined
              Fair Launch curve, allow open trading,
              and migrate liquidity once the launch
              reaches its graduation condition.
            </p>

            <p>
              The protocol uses deterministic launch
              parameters instead of allowing each
              creator to define arbitrary supply,
              initial valuation, or graduation
              thresholds.
            </p>

            <p>
              The objective is a launch environment
              that is simple to understand, easy to
              interact with, and transparent about
              how price and inventory evolve.
            </p>

            <div className="litepaper-statement">
              <span>
                CORE IDEA_
              </span>

              <strong>
                CREATE → TRADE → GRADUATE
              </strong>
            </div>
          </div>
        </section>


        {/* 02 PRINCIPLES */}

        <section
          className="litepaper-section"
          id="principles"
        >
          <div className="litepaper-section-number">
            02
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              DESIGN PRINCIPLES
            </span>

            <h2>
              Minimal interface.
              Deterministic protocol.
            </h2>

            <p>
              SEIS TERMINAL is intentionally narrow
              in scope. The protocol focuses on the
              core actions required for a token
              launch market rather than combining
              unrelated functionality into the
              launch process.
            </p>

            <div className="litepaper-principles-grid">
              <div>
                <span>01</span>

                <strong>
                  SIMPLE_
                </strong>

                <p>
                  A direct flow from creation to
                  trading without unnecessary launch
                  configuration.
                </p>
              </div>

              <div>
                <span>02</span>

                <strong>
                  TRANSPARENT_
                </strong>

                <p>
                  Launch parameters and price
                  mechanics are predefined and
                  observable.
                </p>
              </div>

              <div>
                <span>03</span>

                <strong>
                  DETERMINISTIC_
                </strong>

                <p>
                  Supply and graduation behavior are
                  derived from protocol rules rather
                  than creator discretion.
                </p>
              </div>

              <div>
                <span>04</span>

                <strong>
                  USER CONTROLLED_
                </strong>

                <p>
                  Wallet transactions require
                  explicit authorization from the
                  user.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* 03 OVERVIEW */}

        <section
          className="litepaper-section"
          id="overview"
        >
          <div className="litepaper-section-number">
            03
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              PROTOCOL OVERVIEW
            </span>

            <h2>
              A three-state launch lifecycle.
            </h2>

            <p>
              Each Fair Launch begins in the ACTIVE
              state, where tokens can be bought and
              sold through the bonding curve.
            </p>

            <p>
              When the curve inventory reaches the
              graduation boundary, the launch moves
              to GRADUATING. Liquidity migration can
              then be executed permissionlessly.
            </p>

            <p>
              After a successful migration, the
              launch enters GRADUATED and the
              bonding-curve phase is complete.
            </p>

            <div className="litepaper-state-flow">
              <div>
                <span>
                  01
                </span>

                <strong>
                  ACTIVE
                </strong>

                <small>
                  Curve trading
                </small>
              </div>

              <div>
                →
              </div>

              <div>
                <span>
                  02
                </span>

                <strong>
                  GRADUATING
                </strong>

                <small>
                  Migration eligible
                </small>
              </div>

              <div>
                →
              </div>

              <div>
                <span>
                  03
                </span>

                <strong>
                  GRADUATED
                </strong>

                <small>
                  Migration complete
                </small>
              </div>
            </div>
          </div>
        </section>


        {/* 04 ECONOMICS */}

        <section
          className="litepaper-section"
          id="economics"
        >
          <div className="litepaper-section-number">
            04
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              FAIR LAUNCH ECONOMICS
            </span>

            <h2>
              Fixed parameters define the
              launch environment.
            </h2>

            <p>
              The current protocol version uses a
              fixed total token supply and predefined
              valuation boundaries for every Fair
              Launch.
            </p>

            <div className="litepaper-metrics">
              <div>
                <span>
                  TOTAL SUPPLY
                </span>

                <strong>
                  1,000,000,000
                </strong>
              </div>

              <div>
                <span>
                  INITIAL MARKET CAP
                </span>

                <strong>
                  $10,000
                </strong>
              </div>

              <div>
                <span>
                  GRADUATION MARKET CAP
                </span>

                <strong>
                  $60,000
                </strong>
              </div>
            </div>

            <p>
              The protocol does not use a manually
              selected 80/20 distribution split.
              Instead, the curve inventory is derived
              from the graduation target and the
              requirement to preserve price
              continuity at migration.
            </p>

            <div className="litepaper-split">
              <div>
                <span>
                  CURVE DISTRIBUTION
                </span>

                <strong>
                  ≈ 71.010205%
                </strong>

                <small>
                  ≈ 710,102,051 tokens
                </small>
              </div>

              <div>
                <span>
                  LIQUIDITY INVENTORY
                </span>

                <strong>
                  ≈ 28.989795%
                </strong>

                <small>
                  ≈ 289,897,949 tokens
                </small>
              </div>
            </div>
          </div>
        </section>


        {/* 05 CURVE */}

        <section
          className="litepaper-section"
          id="curve"
        >
          <div className="litepaper-section-number">
            05
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              BONDING CURVE
            </span>

            <h2>
              Virtual reserves define price.
            </h2>

            <p>
              Fair Launch pricing uses a
              constant-product virtual reserve
              model.
            </p>

            <div className="litepaper-formula">
              <span>
                CONSTANT PRODUCT
              </span>

              <strong>
                x × y = k
              </strong>
            </div>

            <div className="litepaper-reserve-grid">
              <div>
                <span>
                  INITIAL VIRTUAL TOKEN RESERVE
                </span>

                <strong>
                  1,200,000,000
                </strong>
              </div>

              <div>
                <span>
                  INITIAL VIRTUAL QUOTE RESERVE
                </span>

                <strong>
                  12,000 USDC
                </strong>
              </div>
            </div>

            <p>
              During trading, the current virtual
              reserves are derived from tokens sold
              and the real quote reserve.
            </p>

            <div className="litepaper-equations">
              <code>
                virtualTokenReserve =
                1,200,000,000 - tokensSold
              </code>

              <code>
                virtualQuoteReserve =
                12,000 + quoteReserve
              </code>

              <code>
                spotPrice =
                virtualQuoteReserve /
                virtualTokenReserve
              </code>

              <code>
                marketCap =
                spotPrice × totalSupply
              </code>
            </div>
          </div>
        </section>


        {/* 06 GRADUATION */}

        <section
          className="litepaper-section"
          id="graduation"
        >
          <div className="litepaper-section-number">
            06
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              GRADUATION & LIQUIDITY
            </span>

            <h2>
              The curve terminates at a defined
              liquidity boundary.
            </h2>

            <p>
              At graduation, approximately
              17,393.876913 USDC has accumulated in
              the Fair Launch quote reserve while
              approximately 289.9 million physical
              tokens remain for liquidity.
            </p>

            <div className="litepaper-metrics">
              <div>
                <span>
                  FINAL CURVE PRICE
                </span>

                <strong>
                  0.00006 USDC
                </strong>
              </div>

              <div>
                <span>
                  QUOTE RESERVE
                </span>

                <strong>
                  ≈ 17,393.88
                </strong>
              </div>

              <div>
                <span>
                  LIQUIDITY TOKENS
                </span>

                <strong>
                  ≈ 289.9M
                </strong>
              </div>
            </div>

            <p>
              These quantities are aligned so the
              final bonding-curve price corresponds
              to the intended opening price of the
              migrated liquidity position.
            </p>

            <div className="litepaper-statement">
              <span>
                PRICE CONTINUITY_
              </span>

              <strong>
                Pcurve(final)
                =
                Pliquidity(open)
              </strong>
            </div>
          </div>
        </section>


        {/* 07 ARCHITECTURE */}

        <section
          className="litepaper-section"
          id="architecture"
        >
          <div className="litepaper-section-number">
            07
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              ARCHITECTURE
            </span>

            <h2>
              Separate responsibilities,
              shared lifecycle.
            </h2>

            <p>
              The current implementation separates
              launch state, token creation, pricing
              mathematics, and liquidity migration
              into distinct contract components.
            </p>

            <div className="litepaper-architecture">
              <div>
                <span>
                  01
                </span>

                <strong>
                  LaunchFactory
                </strong>

                <p>
                  Creates launches, stores state,
                  executes trading, and coordinates
                  graduation.
                </p>
              </div>

              <div>
                <span>
                  02
                </span>

                <strong>
                  MemeToken
                </strong>

                <p>
                  Token contract created for each
                  Fair Launch.
                </p>
              </div>

              <div>
                <span>
                  03
                </span>

                <strong>
                  BondingCurveV3
                </strong>

                <p>
                  Provides Fair Launch pricing and
                  graduation mathematics.
                </p>
              </div>

              <div>
                <span>
                  04
                </span>

                <strong>
                  MigrationAdapter
                </strong>

                <p>
                  Provides the boundary between Fair
                  Launch graduation and liquidity
                  migration.
                </p>
              </div>
            </div>

            <div className="litepaper-contract">
              <span>
                CURRENT LAUNCH FACTORY
              </span>

              <strong>
                0x8Da50245171d09a544eb047fc3d4e8cE4514931A
              </strong>
            </div>
          </div>
        </section>


        {/* 08 SECURITY */}

        <section
          className="litepaper-section"
          id="security"
        >
          <div className="litepaper-section-number">
            08
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              SECURITY MODEL
            </span>

            <h2>
              Minimize unnecessary permissions.
            </h2>

            <p>
              SEIS TERMINAL is non-custodial at the
              wallet interaction layer. Private keys
              and seed phrases remain outside the
              application.
            </p>

            <p>
              State-changing transactions require
              explicit wallet authorization.
              BUY does not require a separate ERC-20
              token approval in the current Fair
              Launch flow, while SELL uses an
              exact-amount approval policy rather
              than unlimited allowance.
            </p>

            <div className="litepaper-security-grid">
              <div>
                <strong>
                  USER AUTHORIZATION
                </strong>

                <span>
                  Explicit wallet confirmation
                </span>
              </div>

              <div>
                <strong>
                  LIMITED APPROVALS
                </strong>

                <span>
                  Exact sell amount
                </span>
              </div>

              <div>
                <strong>
                  REENTRANCY PROTECTION
                </strong>

                <span>
                  State-changing Factory operations
                </span>
              </div>

              <div>
                <strong>
                  ATOMIC MIGRATION
                </strong>

                <span>
                  Success or full revert
                </span>
              </div>
            </div>

            <p>
              Blockchain state remains authoritative
              for protocol execution. Metadata,
              indexing, charts, and cache are
              supplementary interface systems.
            </p>
          </div>
        </section>


        {/* 09 RISKS */}

        <section
          className="litepaper-section"
          id="risks"
        >
          <div className="litepaper-section-number">
            09
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              RISKS
            </span>

            <h2>
              Protocol transparency does not
              eliminate market or technical risk.
            </h2>

            <p>
              Token launches and blockchain trading
              involve financial, smart-contract,
              wallet, network, liquidity, and
              infrastructure risk.
            </p>

            <p>
              Deterministic launch rules do not
              guarantee token value, liquidity,
              market demand, or investment returns.
            </p>

            <div className="litepaper-risk">
              <span>
                IMPORTANT_
              </span>

              <strong>
                VERIFY BEFORE YOU SIGN
              </strong>

              <p>
                Users should independently review
                token addresses, wallet prompts,
                network selection, and transaction
                parameters before authorization.
              </p>
            </div>
          </div>
        </section>


        {/* 10 FUTURE */}

        <section
          className="litepaper-section"
          id="future"
        >
          <div className="litepaper-section-number">
            10
          </div>

          <div className="litepaper-section-body">
            <span className="litepaper-kicker">
              FUTURE DEVELOPMENT
            </span>

            <h2>
              Extend the terminal without
              complicating the core protocol.
            </h2>

            <p>
              SEIS TERMINAL v1 focuses on Fair
              Launch creation, discovery, trading,
              and graduation.
            </p>

            <p>
              Future versions may extend the
              interface and protocol surface while
              preserving the principle that core
              launch mechanics should remain
              understandable and explicit.
            </p>

            <div className="litepaper-future-grid">
              <div>
                <span>
                  CURRENT
                </span>

                <strong>
                  FAIR LAUNCH
                </strong>
              </div>

              <div>
                <span>
                  CURRENT
                </span>

                <strong>
                  BUY / SELL
                </strong>
              </div>

              <div>
                <span>
                  FUTURE
                </span>

                <strong>
                  LIQUIDITY LAUNCH
                </strong>
              </div>

              <div>
                <span>
                  FUTURE
                </span>

                <strong>
                  ADDITIONAL TERMINAL TOOLS
                </strong>
              </div>
            </div>

            <div className="litepaper-end">
              <span>
                SEIS TERMINAL_
              </span>

              <strong>
                Protocol Litepaper v1.0
              </strong>

              <p>
                This document describes the current
                protocol design and may evolve
                alongside future releases.
              </p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default LitepaperPage;