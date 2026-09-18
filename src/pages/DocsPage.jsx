import { useState } from "react";
import "./DocsPage.css";

function DocsPage() {
  const [
    activeSection,
    setActiveSection,
  ] = useState("OVERVIEW");

  const docsSections = [
    {
      id: "OVERVIEW",
      number: "01",
      label: "OVERVIEW",
    },
    {
      id: "GETTING_STARTED",
      number: "02",
      label: "GETTING STARTED",
    },
    {
      id: "LAUNCH",
      number: "03",
      label: "LAUNCH A TOKEN",
    },
    {
      id: "FAIR_LAUNCH",
      number: "04",
      label: "FAIR LAUNCH",
    },
    {
      id: "TRADING",
      number: "05",
      label: "TRADING",
    },
    {
      id: "GRADUATION",
      number: "06",
      label: "GRADUATION",
    },
    {
      id: "PROTOCOL",
      number: "07",
      label: "PROTOCOL MECHANICS",
    },
    {
      id: "CONTRACTS",
      number: "08",
      label: "SMART CONTRACTS",
    },
    {
      id: "SECURITY",
      number: "09",
      label: "SECURITY",
    },
    {
      id: "FAQ",
      number: "10",
      label: "FAQ",
    },
  ];
  
  const currentSection =
    docsSections.find(
      (section) =>
        section.id === activeSection
    ) ?? docsSections[0];

  return (
    <div className="docs-page">
        <aside className="docs-sidebar">
            <div className="docs-sidebar-title">
            DOCUMENTATION_
            </div>

            <nav className="docs-sidebar-nav">
                {docsSections.map((section) => (
                    <button
                        key={section.id}
                        type="button"
                        className={
                        activeSection === section.id
                            ? "docs-sidebar-item docs-sidebar-item-active"
                            : "docs-sidebar-item"
                        }
                        onClick={() => {
                        setActiveSection(section.id);
                        }}
                    >
                        <span>
                        {section.number}
                        </span>

                        {section.label}
                    </button>
                ))}
            </nav>
        </aside>

        <section className="docs-content">
            <div className="docs-breadcrumb">
                SEIS TERMINAL / DOCS /{" "}
                {currentSection.label}_
            </div>
            {activeSection === "OVERVIEW" && (
                <>
                    <div className="docs-hero">
                    <span className="docs-kicker">
                        01 / OVERVIEW
                    </span>

                    <h1>
                        SEIS TERMINAL
                        <br />
                        DOCUMENTATION_
                    </h1>

                    <p>
                        A lightweight token launch and trading terminal
                        built for the ARC ecosystem.
                    </p>
                    </div>

                    <div className="docs-divider" />

                    <article className="docs-article">
                    <section className="docs-section">
                        <h2>
                        What is SEIS TERMINAL?
                        </h2>

                        <p>
                        SEIS TERMINAL is a token launch and trading
                        platform designed around a simple workflow:
                        launch, trade, and discover.
                        </p>

                        <p>
                        Users can create tokens through a predefined
                        Fair Launch model and trade them directly from
                        the terminal.
                        </p>
                    </section>

                    <section className="docs-section">
                        <h2>
                        Core Functions
                        </h2>

                        <div className="docs-feature-grid">
                        <div className="docs-feature-card">
                            <span className="docs-feature-index">
                            01
                            </span>

                            <strong>
                            LAUNCH
                            </strong>

                            <p>
                            Create a token using protocol-defined
                            Fair Launch parameters.
                            </p>
                        </div>

                        <div className="docs-feature-card">
                            <span className="docs-feature-index">
                            02
                            </span>

                            <strong>
                            TRADE
                            </strong>

                            <p>
                            Buy and sell active Fair Launch tokens
                            directly from the terminal.
                            </p>
                        </div>

                        <div className="docs-feature-card">
                            <span className="docs-feature-index">
                            03
                            </span>

                            <strong>
                            DISCOVER
                            </strong>

                            <p>
                            Explore newly launched tokens, market data,
                            trading activity, and launch progress.
                            </p>
                        </div>
                        </div>
                    </section>

                    <section className="docs-section">
                        <h2>
                        Fair Launch Lifecycle
                        </h2>

                        <div className="docs-lifecycle">
                        <div className="docs-lifecycle-step">
                            <span>01</span>

                            <strong>
                            ACTIVE
                            </strong>

                            <small>
                            Bonding curve trading is active.
                            </small>
                        </div>

                        <div className="docs-lifecycle-arrow">
                            →
                        </div>

                        <div className="docs-lifecycle-step">
                            <span>02</span>

                            <strong>
                            GRADUATING
                            </strong>

                            <small>
                            Graduation target has been reached.
                            </small>
                        </div>

                        <div className="docs-lifecycle-arrow">
                            →
                        </div>

                        <div className="docs-lifecycle-step">
                            <span>03</span>

                            <strong>
                            GRADUATED
                            </strong>

                            <small>
                            Liquidity migration is complete.
                            </small>
                        </div>
                        </div>
                    </section>

                    <section className="docs-section">
                        <h2>
                        Protocol Parameters
                        </h2>

                        <div className="docs-stat-grid">
                        <div className="docs-stat">
                            <span>
                            TOTAL SUPPLY
                            </span>

                            <strong>
                            1,000,000,000
                            </strong>
                        </div>

                        <div className="docs-stat">
                            <span>
                            INITIAL MARKET CAP
                            </span>

                            <strong>
                            $10,000
                            </strong>
                        </div>

                        <div className="docs-stat">
                            <span>
                            GRADUATION MARKET CAP
                            </span>

                            <strong>
                            $60,000
                            </strong>
                        </div>
                        </div>
                    </section>
                    </article>
                </>
            )}

            {activeSection === "GETTING_STARTED" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    02 / GETTING STARTED
                </span>

                <h1>
                    GETTING STARTED_
                </h1>

                <p>
                    Connect your wallet, explore the market,
                    launch tokens, and trade directly from
                    SEIS TERMINAL.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* CONNECT WALLET */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 01
                    </span>

                    <h2>
                    Connect Your Wallet
                    </h2>

                    <p>
                    To interact with SEIS TERMINAL, connect
                    a compatible browser wallet using the
                    wallet button in the sidebar.
                    </p>

                    <p>
                    Wallet connection is initiated only when
                    you choose to connect. SEIS TERMINAL does
                    not request access to your private keys
                    or seed phrase.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        &gt;_
                    </span>

                    <div>
                        <strong>
                        CONNECT WALLET
                        </strong>

                        <small>
                        Select an available wallet and approve
                        the connection request.
                        </small>
                    </div>
                    </div>
                </section>


                {/* NETWORK */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 02
                    </span>

                    <h2>
                    Select the Network
                    </h2>

                    <p>
                    SEIS TERMINAL currently operates on
                    ARC Mainnet. Before launching or trading,
                    make sure your wallet is connected to
                    the supported network.
                    </p>

                    <div className="docs-network-card">
                    <div>
                        <span>
                        NETWORK
                        </span>

                        <strong>
                        ARC MAINNET
                        </strong>
                    </div>

                    <div>
                        <span>
                        CHAIN ID
                        </span>

                        <strong>
                        5042
                        </strong>
                    </div>

                    <div>
                        <span>
                        QUOTE ASSET
                        </span>

                        <strong>
                        USDC
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        NOTE_
                    </span>

                    <p>
                        If your wallet is connected to another
                        network, select ARC Mainnet in your
                        wallet before submitting a transaction.
                    </p>
                    </div>
                </section>


                {/* MARKET */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 03
                    </span>

                    <h2>
                    Explore the Market
                    </h2>

                    <p>
                    The Market is the main discovery interface
                    for tokens launched through SEIS TERMINAL.
                    </p>

                    <p>
                    From the Market you can view token prices,
                    market capitalization, transaction activity,
                    launch progress, and available liquidity.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    MARKET / SELECT TOKEN / OPEN TRADE
                    </div>
                </section>


                {/* LAUNCH */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 04
                    </span>

                    <h2>
                    Launch a Token
                    </h2>

                    <p>
                    Select LAUNCH TOKEN_ to create a new token
                    through the SEIS TERMINAL Fair Launch
                    protocol.
                    </p>

                    <p>
                    Enter the token information, choose an
                    optional developer purchase amount, review
                    the launch details, and confirm the
                    transaction in your wallet.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    LAUNCH TOKEN_ / CONFIGURE / CONFIRM
                    </div>

                    <div className="docs-note">
                    <span>
                        INFO_
                    </span>

                    <p>
                        A developer purchase is optional and is
                        executed as a real purchase through the
                        launch curve. It is not a free token
                        allocation.
                    </p>
                    </div>
                </section>


                {/* TRADE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 05
                    </span>

                    <h2>
                    Trade a Token
                    </h2>

                    <p>
                    Select a token from the Market to open its
                    trading interface. Active Fair Launch
                    tokens can be bought and sold directly
                    through SEIS TERMINAL.
                    </p>

                    <div className="docs-action-grid">
                    <div className="docs-action-card">
                        <span>
                        BUY
                        </span>

                        <strong>
                        USDC → TOKEN
                        </strong>

                        <p>
                        Enter the amount you want to spend,
                        review the trade, and confirm it in
                        your wallet.
                        </p>
                    </div>

                    <div className="docs-action-card">
                        <span>
                        SELL
                        </span>

                        <strong>
                        TOKEN → USDC
                        </strong>

                        <p>
                        Choose the amount of tokens to sell
                        and approve the required token amount
                        when necessary.
                        </p>
                    </div>
                    </div>
                </section>


                {/* TRANSACTION CONTROL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 06
                    </span>

                    <h2>
                    Confirm Transactions
                    </h2>

                    <p>
                    Transactions that move assets or change
                    blockchain state require confirmation in
                    your connected wallet.
                    </p>

                    <p>
                    Always review the transaction details in
                    your wallet before confirming.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        ✓
                    </span>

                    <div>
                        <strong>
                        YOU STAY IN CONTROL_
                        </strong>

                        <small>
                        Your wallet remains responsible for
                        transaction authorization and signing.
                        </small>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "LAUNCH" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    03 / LAUNCH A TOKEN
                </span>

                <h1>
                    LAUNCH A TOKEN_
                </h1>

                <p>
                    Create a new token through the SEIS TERMINAL
                    Fair Launch protocol using a fixed launch
                    configuration and an optional developer
                    purchase.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* OPEN LAUNCH */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 01
                    </span>

                    <h2>
                    Open the Launch Interface
                    </h2>

                    <p>
                    Select LAUNCH or LAUNCH TOKEN_ from the
                    main sidebar to open the token launch
                    interface.
                    </p>

                    <p>
                    Your wallet must be connected to ARC
                    Testnet before a launch transaction can
                    be submitted.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    LAUNCH TOKEN_ / OPEN
                    </div>
                </section>


                {/* LAUNCH TYPE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 02
                    </span>

                    <h2>
                    Choose the Launch Type
                    </h2>

                    <p>
                    SEIS TERMINAL currently supports Fair
                    Launch as the active token launch model.
                    </p>

                    <div className="docs-launch-type-grid">
                    <div className="docs-launch-type-card docs-launch-type-active">
                        <span>
                        AVAILABLE
                        </span>

                        <strong>
                        FAIR LAUNCH_
                        </strong>

                        <p>
                        Token distribution begins through
                        the bonding curve. Liquidity is
                        created after the graduation target
                        is reached.
                        </p>
                    </div>

                    <div className="docs-launch-type-card docs-launch-type-disabled">
                        <span>
                        COMING SOON
                        </span>

                        <strong>
                        LIQUIDITY LAUNCH_
                        </strong>

                        <p>
                        Launch with initial liquidity.
                        This launch mode is not currently
                        available.
                        </p>
                    </div>
                    </div>
                </section>


                {/* TOKEN DETAILS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 03
                    </span>

                    <h2>
                    Enter Token Details
                    </h2>

                    <p>
                    Provide the token name and symbol that
                    will be used when the token contract is
                    created.
                    </p>

                    <div className="docs-field-grid">
                    <div className="docs-field-card">
                        <span>
                        TOKEN NAME
                        </span>

                        <strong>
                        Up to 32 characters
                        </strong>

                        <p>
                        The full display name of the token.
                        </p>
                    </div>

                    <div className="docs-field-card">
                        <span>
                        SYMBOL
                        </span>

                        <strong>
                        Up to 10 characters
                        </strong>

                        <p>
                        The short ticker symbol used across
                        the terminal.
                        </p>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        FIXED_
                    </span>

                    <p>
                        Every SEIS TERMINAL Fair Launch token
                        uses a fixed total supply of
                        1,000,000,000 tokens.
                    </p>
                    </div>
                </section>


                {/* TOKEN LOGO */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 04
                    </span>

                    <h2>
                    Add a Token Logo
                    </h2>

                    <p>
                    A token logo can be added to improve
                    visibility in the Market and trading
                    interface.
                    </p>

                    <div className="docs-logo-info">
                    <div>
                        <span>
                        SUPPORTED
                        </span>

                        <strong>
                        PNG / JPG / GIF / WEBP
                        </strong>
                    </div>

                    <div>
                        <span>
                        MAX SIZE
                        </span>

                        <strong>
                        2 MB
                        </strong>
                    </div>

                    <div>
                        <span>
                        RECOMMENDED
                        </span>

                        <strong>
                        Square image
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        OPTIONAL_
                    </span>

                    <p>
                        The logo is off-chain metadata and is
                        not required to create the token
                        contract.
                    </p>
                    </div>
                </section>


                {/* ECONOMICS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 05
                    </span>

                    <h2>
                    Review Launch Parameters
                    </h2>

                    <p>
                    Fair Launch tokens use protocol-defined
                    launch parameters. These values are not
                    individually configured by the creator.
                    </p>

                    <div className="docs-stat-grid">
                    <div className="docs-stat">
                        <span>
                        TOTAL SUPPLY
                        </span>

                        <strong>
                        1,000,000,000
                        </strong>
                    </div>

                    <div className="docs-stat">
                        <span>
                        INITIAL MARKET CAP
                        </span>

                        <strong>
                        $10,000
                        </strong>
                    </div>

                    <div className="docs-stat">
                        <span>
                        GRADUATION MARKET CAP
                        </span>

                        <strong>
                        $60,000
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        PROTOCOL_
                    </span>

                    <p>
                        These parameters define the Fair Launch
                        environment and remain consistent across
                        tokens launched through the current
                        protocol version.
                    </p>
                    </div>
                </section>


                {/* DEV BUY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 06
                    </span>

                    <h2>
                    Optional Developer Buy
                    </h2>

                    <p>
                    The creator may include an optional initial
                    purchase as part of the launch transaction.
                    </p>

                    <p>
                    The amount is entered in USDC and is
                    processed through the same Fair Launch
                    bonding curve used by other buyers.
                    </p>

                    <div className="docs-dev-buy-card">
                    <div>
                        <span>
                        INPUT
                        </span>

                        <strong>
                        USDC
                        </strong>
                    </div>

                    <div>
                        <span>
                        TYPE
                        </span>

                        <strong>
                        REAL CURVE PURCHASE
                        </strong>
                    </div>

                    <div>
                        <span>
                        FREE ALLOCATION
                        </span>

                        <strong>
                        NO
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        LIMIT_
                    </span>

                    <p>
                        The protocol limits the creator's
                        launch-time developer purchase to a
                        maximum of 5% of the total token supply.
                    </p>
                    </div>
                </section>


                {/* CONFIRM */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 07
                    </span>

                    <h2>
                    Confirm the Launch
                    </h2>

                    <p>
                    After reviewing the launch configuration,
                    select LAUNCH and confirm the transaction
                    in your connected wallet.
                    </p>

                    <p>
                    The token contract and Fair Launch state
                    are created on-chain once the transaction
                    is confirmed.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        &gt;_
                    </span>

                    <div>
                        <strong>
                        ONE LAUNCH ACTION_
                        </strong>

                        <small>
                        Review the wallet transaction before
                        confirming it.
                        </small>
                    </div>
                    </div>
                </section>


                {/* AFTER LAUNCH */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    STEP 08
                    </span>

                    <h2>
                    After the Launch
                    </h2>

                    <p>
                    After confirmation, the new token becomes
                    available through SEIS TERMINAL and can be
                    discovered from the Market.
                    </p>

                    <p>
                    Trading begins while the launch is ACTIVE.
                    Buyers and sellers interact with the Fair
                    Launch curve until the graduation target
                    is reached.
                    </p>

                    <div className="docs-launch-flow">
                    <div>
                        <span>
                        01
                        </span>

                        <strong>
                        CREATE
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        02
                        </span>

                        <strong>
                        ACTIVE
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        03
                        </span>

                        <strong>
                        TRADE
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        04
                        </span>

                        <strong>
                        GRADUATE
                        </strong>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "FAIR_LAUNCH" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    04 / FAIR LAUNCH
                </span>

                <h1>
                    FAIR LAUNCH_
                </h1>

                <p>
                    A predefined launch model where token
                    distribution begins through a bonding curve
                    before liquidity is migrated after graduation.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* OVERVIEW */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / OVERVIEW
                    </span>

                    <h2>
                    How Fair Launch Works
                    </h2>

                    <p>
                    Every SEIS TERMINAL Fair Launch begins
                    with the same protocol-defined supply
                    and initial curve configuration.
                    </p>

                    <p>
                    Tokens are bought and sold against the
                    Fair Launch bonding curve while the launch
                    remains ACTIVE.
                    </p>

                    <div className="docs-launch-flow">
                    <div>
                        <span>
                        01
                        </span>

                        <strong>
                        LAUNCH
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        02
                        </span>

                        <strong>
                        CURVE
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        03
                        </span>

                        <strong>
                        TARGET
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        04
                        </span>

                        <strong>
                        GRADUATE
                        </strong>
                    </div>
                    </div>
                </section>


                {/* FIXED PARAMETERS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / PARAMETERS
                    </span>

                    <h2>
                    Fixed Launch Parameters
                    </h2>

                    <p>
                    The current Fair Launch protocol uses
                    fixed parameters for every token launched
                    through SEIS TERMINAL.
                    </p>

                    <div className="docs-stat-grid">
                    <div className="docs-stat">
                        <span>
                        TOTAL SUPPLY
                        </span>

                        <strong>
                        1,000,000,000
                        </strong>
                    </div>

                    <div className="docs-stat">
                        <span>
                        INITIAL MARKET CAP
                        </span>

                        <strong>
                        $10,000
                        </strong>
                    </div>

                    <div className="docs-stat">
                        <span>
                        GRADUATION MARKET CAP
                        </span>

                        <strong>
                        $60,000
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        FIXED_
                    </span>

                    <p>
                        Creators do not independently configure
                        these values for each launch.
                    </p>
                    </div>
                </section>


                {/* CURVE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / BONDING CURVE
                    </span>

                    <h2>
                    Bonding Curve Trading
                    </h2>

                    <p>
                    Fair Launch trading uses a constant-product
                    virtual reserve model.
                    </p>

                    <p>
                    As tokens are purchased, the available
                    virtual token reserve decreases and the
                    virtual quote reserve increases. This
                    causes the token price to rise along the
                    curve.
                    </p>

                    <div className="docs-curve-card">
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

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    PRICE = VIRTUAL QUOTE RESERVE / VIRTUAL TOKEN RESERVE
                    </div>
                </section>


                {/* BUY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / BUY
                    </span>

                    <h2>
                    Buying on the Curve
                    </h2>

                    <p>
                    Buyers provide the network's quote asset
                    and receive tokens according to the current
                    state of the bonding curve.
                    </p>

                    <p>
                    Each successful purchase increases the
                    amount of tokens sold and moves the curve
                    forward.
                    </p>

                    <div className="docs-action-card docs-action-card-wide">
                    <span>
                        BUY
                    </span>

                    <strong>
                        USDC → TOKEN
                    </strong>

                    <p>
                        The token amount received depends on
                        the current curve state at the time the
                        transaction is executed.
                    </p>
                    </div>
                </section>


                {/* SELL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / SELL
                    </span>

                    <h2>
                    Selling on the Curve
                    </h2>

                    <p>
                    While the launch remains ACTIVE, holders
                    can sell tokens back into the Fair Launch
                    contract.
                    </p>

                    <p>
                    A sell moves the curve in the opposite
                    direction by reducing the number of tokens
                    sold and returning quote value from the
                    launch reserve.
                    </p>

                    <div className="docs-action-card docs-action-card-wide">
                    <span>
                        SELL
                    </span>

                    <strong>
                        TOKEN → USDC
                    </strong>

                    <p>
                        Selling requires the token holder to
                        authorize the required token amount
                        before the contract can transfer it.
                    </p>
                    </div>
                </section>


                {/* DISTRIBUTION */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / DISTRIBUTION
                    </span>

                    <h2>
                    Supply Distribution
                    </h2>

                    <p>
                    The Fair Launch does not use a fixed
                    80/20 or similar manually selected split.
                    </p>

                    <p>
                    Instead, the protocol derives the exact
                    amount of supply sold on the bonding curve
                    from the graduation target and the price
                    continuity requirement.
                    </p>

                    <div className="docs-distribution-grid">
                    <div className="docs-distribution-card">
                        <span>
                        BONDING CURVE
                        </span>

                        <strong>
                        ≈ 71.01%
                        </strong>

                        <p>
                        Approximately 710.1 million tokens
                        are distributed through the curve by
                        the time graduation is reached.
                        </p>
                    </div>

                    <div className="docs-distribution-card">
                        <span>
                        LIQUIDITY
                        </span>

                        <strong>
                        ≈ 28.99%
                        </strong>

                        <p>
                        The remaining supply is reserved for
                        liquidity migration at graduation.
                        </p>
                    </div>
                    </div>
                </section>


                {/* GRADUATION TARGET */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / GRADUATION TARGET
                    </span>

                    <h2>
                    Reaching Graduation
                    </h2>

                    <p>
                    The launch progresses toward a
                    $60,000 market capitalization target.
                    </p>

                    <p>
                    At the final bonding-curve state, the
                    protocol reaches a spot price of
                    0.00006 USDC per token.
                    </p>

                    <div className="docs-graduation-metrics">
                    <div>
                        <span>
                        TARGET MARKET CAP
                        </span>

                        <strong>
                        $60,000
                        </strong>
                    </div>

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
                        QUOTE ACCUMULATED
                        </span>

                        <strong>
                        ≈ 17,393.88 USDC
                        </strong>
                    </div>
                    </div>
                </section>


                {/* STATUS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / STATUS
                    </span>

                    <h2>
                    Launch Status
                    </h2>

                    <div className="docs-lifecycle">
                    <div className="docs-lifecycle-step">
                        <span>
                        01
                        </span>

                        <strong>
                        ACTIVE
                        </strong>

                        <small>
                        Bonding curve buy and sell trading
                        is available.
                        </small>
                    </div>

                    <div className="docs-lifecycle-arrow">
                        →
                    </div>

                    <div className="docs-lifecycle-step">
                        <span>
                        02
                        </span>

                        <strong>
                        GRADUATING
                        </strong>

                        <small>
                        The curve inventory has reached the
                        graduation condition.
                        </small>
                    </div>

                    <div className="docs-lifecycle-arrow">
                        →
                    </div>

                    <div className="docs-lifecycle-step">
                        <span>
                        03
                        </span>

                        <strong>
                        GRADUATED
                        </strong>

                        <small>
                        Liquidity migration has completed.
                        </small>
                    </div>
                    </div>
                </section>


                {/* CONTINUITY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / PRICE CONTINUITY
                    </span>

                    <h2>
                    Curve to DEX Continuity
                    </h2>

                    <p>
                    The Fair Launch parameters are designed
                    so that the final bonding-curve price
                    matches the intended opening price of the
                    migrated liquidity pool.
                    </p>

                    <p>
                    This avoids introducing a deliberately
                    different opening price simply because
                    the launch transitions from bonding-curve
                    trading to liquidity-pool trading.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        =
                    </span>

                    <div>
                        <strong>
                        FINAL CURVE PRICE = DEX OPENING PRICE_
                        </strong>

                        <small>
                        0.00006 USDC per token at the
                        graduation boundary.
                        </small>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "TRADING" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    05 / TRADING
                </span>

                <h1>
                    TRADING_
                </h1>

                <p>
                    Buy and sell active Fair Launch tokens
                    directly from SEIS TERMINAL using the
                    connected wallet.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* OPEN TRADING */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / OPEN
                    </span>

                    <h2>
                    Open a Token
                    </h2>

                    <p>
                    Select a token from the Market to open
                    its trading interface.
                    </p>

                    <p>
                    The terminal displays the token's current
                    market information together with BUY and
                    SELL controls.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    MARKET / SELECT TOKEN / TRADE
                    </div>
                </section>


                {/* BUY / SELL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / TRADE SIDES
                    </span>

                    <h2>
                    Buy or Sell
                    </h2>

                    <p>
                    Active Fair Launch tokens can move in
                    either direction through the bonding
                    curve.
                    </p>

                    <div className="docs-trade-side-grid">
                    <div className="docs-trade-side-card">
                        <span>
                        BUY_
                        </span>

                        <strong>
                        USDC → TOKEN
                        </strong>

                        <p>
                        Provide USDC and receive tokens
                        according to the current state of
                        the Fair Launch curve.
                        </p>
                    </div>

                    <div className="docs-trade-side-card">
                        <span>
                        SELL_
                        </span>

                        <strong>
                        TOKEN → USDC
                        </strong>

                        <p>
                        Return tokens to the Fair Launch
                        contract and receive USDC according
                        to the current curve state.
                        </p>
                    </div>
                    </div>
                </section>


                {/* BALANCES */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / BALANCES
                    </span>

                    <h2>
                    Wallet Balances
                    </h2>

                    <p>
                    The trade panel shows the balance relevant
                    to the selected trade direction.
                    </p>

                    <div className="docs-balance-grid">
                    <div>
                        <span>
                        BUY MODE
                        </span>

                        <strong>
                        USDC BALANCE
                        </strong>

                        <small>
                        Available quote balance in the
                        connected wallet.
                        </small>
                    </div>

                    <div>
                        <span>
                        SELL MODE
                        </span>

                        <strong>
                        TOKEN BALANCE
                        </strong>

                        <small>
                        Available balance of the selected
                        Fair Launch token.
                        </small>
                    </div>
                    </div>
                </section>


                {/* QUICK AMOUNTS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / QUICK AMOUNTS
                    </span>

                    <h2>
                    Quick Trade Controls
                    </h2>

                    <p>
                    Preset controls provide a faster way to
                    select common trade amounts.
                    </p>

                    <div className="docs-preset-group">
                    <div className="docs-preset-row">
                        <span>
                        BUY
                        </span>

                        <div>
                        <strong>$25</strong>
                        <strong>$100</strong>
                        <strong>$250</strong>
                        <strong>$500</strong>
                        </div>
                    </div>

                    <div className="docs-preset-row">
                        <span>
                        SELL
                        </span>

                        <div>
                        <strong>25%</strong>
                        <strong>50%</strong>
                        <strong>75%</strong>
                        <strong>100%</strong>
                        </div>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        INFO_
                    </span>

                    <p>
                        Sell percentage controls use the
                        connected wallet's balance of the
                        selected token.
                    </p>
                    </div>
                </section>


                {/* BUY FLOW */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / BUY
                    </span>

                    <h2>
                    Buying a Token
                    </h2>

                    <p>
                    Enter the amount of USDC you want to use
                    or select one of the available quick-buy
                    amounts.
                    </p>

                    <p>
                    SEIS TERMINAL obtains the current curve
                    quote before the transaction is submitted.
                    The final execution is determined by the
                    on-chain Fair Launch state.
                    </p>

                    <div className="docs-trade-flow">
                    <div>
                        <span>01</span>
                        <strong>AMOUNT</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>02</span>
                        <strong>QUOTE</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>03</span>
                        <strong>CONFIRM</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>04</span>
                        <strong>RECEIVE</strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        BUY_
                    </span>

                    <p>
                        Buying through the current Fair Launch
                        flow does not require a separate ERC-20
                        token approval.
                    </p>
                    </div>
                </section>


                {/* SELL FLOW */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / SELL
                    </span>

                    <h2>
                    Selling a Token
                    </h2>

                    <p>
                    Enter the number of tokens you want to
                    sell or use one of the percentage presets.
                    </p>

                    <p>
                    Before the Fair Launch contract can
                    transfer tokens from your wallet, the
                    required token amount must be authorized.
                    </p>

                    <div className="docs-approval-card">
                    <span>
                        APPROVAL POLICY_
                    </span>

                    <strong>
                        EXACT AMOUNT
                    </strong>

                    <p>
                        SEIS TERMINAL uses the required sell
                        amount rather than requesting an
                        unlimited token approval.
                    </p>
                    </div>

                    <div className="docs-trade-flow">
                    <div>
                        <span>01</span>
                        <strong>AMOUNT</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>02</span>
                        <strong>APPROVE</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>03</span>
                        <strong>SELL</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>04</span>
                        <strong>RECEIVE</strong>
                    </div>
                    </div>
                </section>


                {/* WALLET CONFIRMATION */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / CONFIRMATION
                    </span>

                    <h2>
                    Wallet Confirmation
                    </h2>

                    <p>
                    Asset-moving transactions require
                    confirmation through the connected wallet.
                    </p>

                    <p>
                    SEIS TERMINAL does not submit a trade
                    merely because a token or preset amount
                    has been selected.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        ✓
                    </span>

                    <div>
                        <strong>
                        REVIEW BEFORE CONFIRMING_
                        </strong>

                        <small>
                        Verify the trade details shown by
                        your wallet before authorizing the
                        transaction.
                        </small>
                    </div>
                    </div>
                </section>


                {/* MARKET DATA */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / MARKET DATA
                    </span>

                    <h2>
                    Trading Information
                    </h2>

                    <p>
                    The trading interface combines current
                    launch information with indexed trading
                    activity to make each token easier to
                    follow.
                    </p>

                    <div className="docs-market-data-grid">
                    <div>
                        <span>
                        PRICE
                        </span>

                        <strong>
                        CURRENT CURVE PRICE
                        </strong>
                    </div>

                    <div>
                        <span>
                        MARKET CAP
                        </span>

                        <strong>
                        CURRENT VALUATION
                        </strong>
                    </div>

                    <div>
                        <span>
                        CHART
                        </span>

                        <strong>
                        CANDLESTICK DATA
                        </strong>
                    </div>

                    <div>
                        <span>
                        TRADES
                        </span>

                        <strong>
                        VERIFIED ACTIVITY
                        </strong>
                    </div>

                    <div>
                        <span>
                        HOLDERS
                        </span>

                        <strong>
                        HOLDER DATA
                        </strong>
                    </div>

                    <div>
                        <span>
                        PROGRESS
                        </span>

                        <strong>
                        LAUNCH PROGRESS
                        </strong>
                    </div>
                    </div>
                </section>


                {/* DATA MODEL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / DATA
                    </span>

                    <h2>
                    On-Chain State and Indexed Data
                    </h2>

                    <p>
                    Blockchain state remains the source of
                    truth for Fair Launch balances, reserves,
                    status, and transaction execution.
                    </p>

                    <p>
                    SEIS TERMINAL also uses indexed data to
                    provide faster access to interface features
                    such as charts, recent trading activity,
                    and holder information.
                    </p>

                    <div className="docs-data-source-grid">
                    <div className="docs-data-source-card">
                        <span>
                        SOURCE OF TRUTH
                        </span>

                        <strong>
                        BLOCKCHAIN_
                        </strong>

                        <p>
                        Launch state, reserves, balances,
                        execution, and settlement.
                        </p>
                    </div>

                    <div className="docs-data-source-card">
                        <span>
                        INTERFACE INDEX
                        </span>

                        <strong>
                        INDEXED DATA_
                        </strong>

                        <p>
                        Trading history, charts, metadata,
                        and interface-level analytics.
                        </p>
                    </div>
                    </div>
                </section>


                {/* ACTIVE STATUS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    10 / AVAILABILITY
                    </span>

                    <h2>
                    When Curve Trading Ends
                    </h2>

                    <p>
                    Bonding-curve BUY and SELL operations are
                    available while the Fair Launch remains
                    ACTIVE.
                    </p>

                    <p>
                    Once the curve reaches its graduation
                    condition, the launch moves to GRADUATING
                    and the bonding-curve trading phase ends.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    ACTIVE → GRADUATING → GRADUATED
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "GRADUATION" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    06 / GRADUATION
                </span>

                <h1>
                    GRADUATION_
                </h1>

                <p>
                    The transition from Fair Launch bonding-curve
                    trading to migrated liquidity after the
                    graduation condition is reached.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* OVERVIEW */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / OVERVIEW
                    </span>

                    <h2>
                    What is Graduation?
                    </h2>

                    <p>
                    Graduation marks the end of the Fair Launch
                    bonding-curve phase.
                    </p>

                    <p>
                    Once the curve reaches its final inventory
                    condition, the launch moves from ACTIVE to
                    GRADUATING and becomes eligible for liquidity
                    migration.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    ACTIVE → GRADUATING → GRADUATED
                    </div>
                </section>


                {/* TRIGGER */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / TRIGGER
                    </span>

                    <h2>
                    Graduation Condition
                    </h2>

                    <p>
                    The graduation condition is reached when
                    the bonding-curve inventory allocated for
                    Fair Launch trading has been fully sold.
                    </p>

                    <p>
                    At this point the launch reaches the
                    protocol's intended graduation boundary,
                    corresponding to approximately a
                    $60,000 market capitalization.
                    </p>

                    <div className="docs-graduation-trigger">
                    <div>
                        <span>
                        MARKET CAP
                        </span>

                        <strong>
                        ≈ $60,000
                        </strong>
                    </div>

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
                        STATUS
                        </span>

                        <strong>
                        GRADUATING
                        </strong>
                    </div>
                    </div>
                </section>


                {/* WHAT MIGRATES */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / MIGRATION ASSETS
                    </span>

                    <h2>
                    What Moves Into Liquidity?
                    </h2>

                    <p>
                    Graduation uses the remaining physical
                    token inventory together with the quote
                    reserve accumulated during Fair Launch.
                    </p>

                    <div className="docs-migration-grid">
                    <div className="docs-migration-card">
                        <span>
                        TOKEN SIDE
                        </span>

                        <strong>
                        ≈ 289.9M TOKENS
                        </strong>

                        <p>
                        The remaining token supply reserved
                        for liquidity migration.
                        </p>
                    </div>

                    <div className="docs-migration-card">
                        <span>
                        QUOTE SIDE
                        </span>

                        <strong>
                        ≈ 17,393.88 USDC
                        </strong>

                        <p>
                        The quote reserve accumulated by the
                        Fair Launch at the graduation boundary.
                        </p>
                    </div>
                    </div>
                </section>


                {/* PERMISSIONLESS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / EXECUTION
                    </span>

                    <h2>
                    Permissionless Migration
                    </h2>

                    <p>
                    Once a launch is in the GRADUATING state,
                    the migration function can be called
                    permissionlessly.
                    </p>

                    <p>
                    The migration process does not depend on
                    the original token creator being available
                    to complete the transition.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        &gt;_
                    </span>

                    <div>
                        <strong>
                        MIGRATION AVAILABLE_
                        </strong>

                        <small>
                        Any caller may execute the migration
                        once the launch is eligible.
                        </small>
                    </div>
                    </div>
                </section>


                {/* MIGRATION FLOW */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / FLOW
                    </span>

                    <h2>
                    Migration Flow
                    </h2>

                    <div className="docs-graduation-flow">
                    <div>
                        <span>01</span>
                        <strong>GRADUATING</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>02</span>
                        <strong>APPROVE</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>03</span>
                        <strong>MIGRATE</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>04</span>
                        <strong>VALIDATE</strong>
                    </div>

                    <div>→</div>

                    <div>
                        <span>05</span>
                        <strong>GRADUATED</strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        EXACT_
                    </span>

                    <p>
                        The Factory approves the exact token
                        amount required by the migration adapter
                        and clears the allowance after a
                        successful migration.
                    </p>
                    </div>
                </section>


                {/* ATOMICITY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / ATOMICITY
                    </span>

                    <h2>
                    Atomic Migration
                    </h2>

                    <p>
                    The migration is executed as one atomic
                    blockchain transaction.
                    </p>

                    <p>
                    If the migration adapter or downstream
                    liquidity operation reverts, the transaction
                    reverts as a whole rather than leaving the
                    launch partially migrated.
                    </p>

                    <div className="docs-atomic-card">
                    <span>
                        ATOMIC EXECUTION_
                    </span>

                    <strong>
                        SUCCESS OR FULL REVERT
                    </strong>

                    <p>
                        Intermediate state changes do not remain
                        committed if migration fails.
                    </p>
                    </div>
                </section>


                {/* LP */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / LP
                    </span>

                    <h2>
                    Liquidity Position
                    </h2>

                    <p>
                    The migration adapter is expected to create
                    the liquidity position using the migrated
                    token and quote amounts.
                    </p>

                    <p>
                    SEIS TERMINAL validates that the migration
                    returns a non-zero pool and non-zero LP
                    amount before the launch can complete
                    graduation.
                    </p>

                    <div className="docs-lp-card">
                    <div>
                        <span>
                        LP DESTINATION
                        </span>

                        <strong>
                        BURN ADDRESS
                        </strong>
                    </div>

                    <div>
                        <span>
                        EXPECTED ADDRESS
                        </span>

                        <strong>
                        0x...dEaD
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        VALIDATION_
                    </span>

                    <p>
                        The LaunchFactory constructor verifies
                        that the configured migration adapter
                        reports the expected LP burn address.
                    </p>
                    </div>
                </section>


                {/* STATE AFTER */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / FINAL STATE
                    </span>

                    <h2>
                    After Migration
                    </h2>

                    <p>
                    After a successful migration, the launch
                    status is changed to GRADUATED.
                    </p>

                    <p>
                    The Fair Launch quote reserve is cleared
                    because those funds have been transferred
                    into the migration process.
                    </p>

                    <div className="docs-final-state-grid">
                    <div>
                        <span>
                        STATUS
                        </span>

                        <strong>
                        GRADUATED
                        </strong>
                    </div>

                    <div>
                        <span>
                        FAIR LAUNCH QUOTE RESERVE
                        </span>

                        <strong>
                        0
                        </strong>
                    </div>

                    <div>
                        <span>
                        BONDING CURVE PHASE
                        </span>

                        <strong>
                        COMPLETE
                        </strong>
                    </div>
                    </div>
                </section>


                {/* CONTINUITY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / CONTINUITY
                    </span>

                    <h2>
                    Price Continuity
                    </h2>

                    <p>
                    The token and quote amounts used for
                    graduation are derived so that the
                    intended liquidity opening price aligns
                    with the final bonding-curve price.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        =
                    </span>

                    <div>
                        <strong>
                        FINAL CURVE PRICE = LIQUIDITY OPENING PRICE_
                        </strong>

                        <small>
                        Designed around the 0.00006 USDC
                        graduation boundary.
                        </small>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "PROTOCOL" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    07 / PROTOCOL MECHANICS
                </span>

                <h1>
                    PROTOCOL MECHANICS_
                </h1>

                <p>
                    The mathematical and state-transition model
                    behind SEIS TERMINAL Fair Launch trading,
                    pricing, and graduation.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* MODEL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / MODEL
                    </span>

                    <h2>
                    Constant-Product Virtual Reserves
                    </h2>

                    <p>
                    SEIS TERMINAL Fair Launch pricing is based
                    on a constant-product virtual reserve model.
                    </p>

                    <p>
                    The curve tracks a virtual token reserve
                    and a virtual quote reserve. Their product
                    defines the pricing relationship used for
                    buy and sell calculations.
                    </p>

                    <div className="docs-formula-card">
                    <span>
                        CORE RELATIONSHIP
                    </span>

                    <strong>
                        x × y = k
                    </strong>

                    <p>
                        x = virtual token reserve
                        <br />
                        y = virtual quote reserve
                        <br />
                        k = constant product
                    </p>
                    </div>
                </section>


                {/* INITIAL STATE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / INITIAL STATE
                    </span>

                    <h2>
                    Initial Curve Configuration
                    </h2>

                    <p>
                    Every Fair Launch begins from the same
                    virtual reserve configuration.
                    </p>

                    <div className="docs-mechanics-grid">
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
                        VIRTUAL TOKEN RESERVE
                        </span>

                        <strong>
                        1,200,000,000
                        </strong>
                    </div>

                    <div>
                        <span>
                        VIRTUAL QUOTE RESERVE
                        </span>

                        <strong>
                        12,000 USDC
                        </strong>
                    </div>

                    <div>
                        <span>
                        INITIAL SPOT PRICE
                        </span>

                        <strong>
                        0.00001 USDC
                        </strong>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        DERIVED_
                    </span>

                    <p>
                        The 1.2B virtual token reserve is a
                        protocol constant derived from the Fair
                        Launch economics. It is not a UI-only
                        display value.
                    </p>
                    </div>
                </section>


                {/* LIVE STATE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / LIVE STATE
                    </span>

                    <h2>
                    Current Virtual Reserves
                    </h2>

                    <p>
                    The live curve state is derived from the
                    amount of tokens sold and the real quote
                    reserve accumulated by the launch.
                    </p>

                    <div className="docs-equation-stack">
                    <div>
                        <span>
                        VIRTUAL TOKEN RESERVE
                        </span>

                        <strong>
                        1,200,000,000 − tokensSold
                        </strong>
                    </div>

                    <div>
                        <span>
                        VIRTUAL QUOTE RESERVE
                        </span>

                        <strong>
                        12,000 + quoteReserve
                        </strong>
                    </div>
                    </div>
                </section>


                {/* PRICE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / PRICE
                    </span>

                    <h2>
                    Spot Price
                    </h2>

                    <p>
                    The current token price is determined by
                    the ratio between the virtual quote reserve
                    and the virtual token reserve.
                    </p>

                    <div className="docs-formula-card">
                    <span>
                        SPOT PRICE
                    </span>

                    <strong>
                        y / x
                    </strong>

                    <p>
                        virtual quote reserve
                        <br />
                        divided by
                        <br />
                        virtual token reserve
                    </p>
                    </div>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    PRICE = (12,000 + QUOTE RESERVE)
                    / (1,200,000,000 - TOKENS SOLD)
                    </div>
                </section>


                {/* MARKET CAP */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / MARKET CAP
                    </span>

                    <h2>
                    Market Capitalization
                    </h2>

                    <p>
                    The terminal derives market capitalization
                    from the current spot price and the fixed
                    total supply.
                    </p>

                    <div className="docs-formula-card">
                    <span>
                        MARKET CAP
                    </span>

                    <strong>
                        spotPrice × totalSupply
                    </strong>

                    <p>
                        Total supply remains fixed at
                        1,000,000,000 tokens.
                    </p>
                    </div>
                </section>


                {/* BUY MOVEMENT */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / BUY MOVEMENT
                    </span>

                    <h2>
                    How a Buy Moves the Curve
                    </h2>

                    <p>
                    A buy adds quote value to the launch and
                    removes tokens from the available curve
                    inventory.
                    </p>

                    <div className="docs-direction-grid">
                    <div>
                        <span>
                        TOKENS SOLD
                        </span>

                        <strong>
                        INCREASES ↑
                        </strong>
                    </div>

                    <div>
                        <span>
                        QUOTE RESERVE
                        </span>

                        <strong>
                        INCREASES ↑
                        </strong>
                    </div>

                    <div>
                        <span>
                        VIRTUAL TOKEN RESERVE
                        </span>

                        <strong>
                        DECREASES ↓
                        </strong>
                    </div>

                    <div>
                        <span>
                        SPOT PRICE
                        </span>

                        <strong>
                        INCREASES ↑
                        </strong>
                    </div>
                    </div>
                </section>


                {/* SELL MOVEMENT */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / SELL MOVEMENT
                    </span>

                    <h2>
                    How a Sell Moves the Curve
                    </h2>

                    <p>
                    A sell returns tokens to the Fair Launch
                    inventory and removes quote value from the
                    launch reserve.
                    </p>

                    <div className="docs-direction-grid">
                    <div>
                        <span>
                        TOKENS SOLD
                        </span>

                        <strong>
                        DECREASES ↓
                        </strong>
                    </div>

                    <div>
                        <span>
                        QUOTE RESERVE
                        </span>

                        <strong>
                        DECREASES ↓
                        </strong>
                    </div>

                    <div>
                        <span>
                        VIRTUAL TOKEN RESERVE
                        </span>

                        <strong>
                        INCREASES ↑
                        </strong>
                    </div>

                    <div>
                        <span>
                        SPOT PRICE
                        </span>

                        <strong>
                        DECREASES ↓
                        </strong>
                    </div>
                    </div>
                </section>


                {/* PHYSICAL VS VIRTUAL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / RESERVE TYPES
                    </span>

                    <h2>
                    Virtual vs Physical Reserves
                    </h2>

                    <p>
                    Virtual reserves are mathematical values
                    used for pricing. They are not the same
                    thing as physical token or quote balances.
                    </p>

                    <div className="docs-reserve-type-grid">
                    <div className="docs-reserve-type-card">
                        <span>
                        VIRTUAL
                        </span>

                        <strong>
                        PRICING STATE_
                        </strong>

                        <p>
                        Used to determine the bonding-curve
                        price and trade quotes.
                        </p>
                    </div>

                    <div className="docs-reserve-type-card">
                        <span>
                        PHYSICAL
                        </span>

                        <strong>
                        ASSET STATE_
                        </strong>

                        <p>
                        Real token inventory and quote value
                        held for execution and migration.
                        </p>
                    </div>
                    </div>
                </section>


                {/* GRADUATION DERIVATION */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / GRADUATION DERIVATION
                    </span>

                    <h2>
                    Derived Graduation Inventory
                    </h2>

                    <p>
                    SEIS TERMINAL does not use a manually
                    selected 80/20 or similar token split.
                    </p>

                    <p>
                    The protocol derives the amount sold on
                    the curve from the target market cap and
                    the price-continuity requirement.
                    </p>

                    <div className="docs-derivation-grid">
                    <div>
                        <span>
                        CURVE INVENTORY SOLD
                        </span>

                        <strong>
                        ≈ 710,102,051
                        </strong>

                        <small>
                        ≈ 71.010205%
                        </small>
                    </div>

                    <div>
                        <span>
                        REMAINING FOR LIQUIDITY
                        </span>

                        <strong>
                        ≈ 289,897,949
                        </strong>

                        <small>
                        ≈ 28.989795%
                        </small>
                    </div>
                    </div>
                </section>


                {/* FINAL STATE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    10 / GRADUATION STATE
                    </span>

                    <h2>
                    Final Curve State
                    </h2>

                    <p>
                    At the graduation boundary, the curve
                    reaches the target market capitalization
                    and final intended spot price.
                    </p>

                    <div className="docs-mechanics-grid">
                    <div>
                        <span>
                        MARKET CAP
                        </span>

                        <strong>
                        $60,000
                        </strong>
                    </div>

                    <div>
                        <span>
                        SPOT PRICE
                        </span>

                        <strong>
                        0.00006 USDC
                        </strong>
                    </div>

                    <div>
                        <span>
                        REAL QUOTE RESERVE
                        </span>

                        <strong>
                        ≈ 17,393.876913
                        </strong>
                    </div>

                    <div>
                        <span>
                        STATUS
                        </span>

                        <strong>
                        GRADUATING
                        </strong>
                    </div>
                    </div>
                </section>


                {/* CONTINUITY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    11 / CONTINUITY
                    </span>

                    <h2>
                    Price Continuity at Migration
                    </h2>

                    <p>
                    The remaining physical token inventory and
                    accumulated quote reserve are aligned with
                    the final bonding-curve price.
                    </p>

                    <p>
                    This allows the intended opening liquidity
                    price to continue from the Fair Launch
                    boundary instead of introducing an arbitrary
                    price reset.
                    </p>

                    <div className="docs-formula-card">
                    <span>
                        CONTINUITY
                    </span>

                    <strong>
                        Pcurve(final) = Pliquidity(open)
                    </strong>

                    <p>
                        Intended boundary price:
                        0.00006 USDC per token.
                    </p>
                    </div>
                </section>


                {/* STATE MACHINE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    12 / STATE MACHINE
                    </span>

                    <h2>
                    Protocol State Transition
                    </h2>

                    <div className="docs-mechanics-flow">
                    <div>
                        <span>01</span>
                        <strong>ACTIVE</strong>
                        <small>
                        Curve trading
                        </small>
                    </div>

                    <div>→</div>

                    <div>
                        <span>02</span>
                        <strong>GRADUATING</strong>
                        <small>
                        Migration eligible
                        </small>
                    </div>

                    <div>→</div>

                    <div>
                        <span>03</span>
                        <strong>GRADUATED</strong>
                        <small>
                        Migration complete
                        </small>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "CONTRACTS" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    08 / SMART CONTRACTS
                </span>

                <h1>
                    SMART CONTRACTS_
                </h1>

                <p>
                    The on-chain components responsible for
                    token creation, Fair Launch trading,
                    bonding-curve calculations, and liquidity
                    migration.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* ARCHITECTURE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / ARCHITECTURE
                    </span>

                    <h2>
                    Protocol Components
                    </h2>

                    <p>
                    SEIS TERMINAL separates the Fair Launch
                    lifecycle into several smart-contract
                    components with distinct responsibilities.
                    </p>

                    <div className="docs-contract-flow">
                    <div>
                        <span>01</span>
                        <strong>LAUNCH FACTORY</strong>
                        <small>
                        Launch and trading state
                        </small>
                    </div>

                    <div>→</div>

                    <div>
                        <span>02</span>
                        <strong>MEME TOKEN</strong>
                        <small>
                        Token contract
                        </small>
                    </div>

                    <div>+</div>

                    <div>
                        <span>03</span>
                        <strong>BONDING CURVE</strong>
                        <small>
                        Pricing mathematics
                        </small>
                    </div>

                    <div>→</div>

                    <div>
                        <span>04</span>
                        <strong>MIGRATION ADAPTER</strong>
                        <small>
                        Graduation boundary
                        </small>
                    </div>
                    </div>
                </section>


                {/* LAUNCH FACTORY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / LAUNCH FACTORY
                    </span>

                    <h2>
                    LaunchFactory
                    </h2>

                    <p>
                    LaunchFactory is the central Fair Launch
                    contract. It creates new token contracts,
                    stores launch state, processes bonding-curve
                    buys and sells, and coordinates graduation.
                    </p>

                    <div className="docs-contract-card">
                    <div className="docs-contract-card-header">
                        <div>
                        <span>
                            CONTRACT
                        </span>

                        <strong>
                            LaunchFactory
                        </strong>
                        </div>

                        <b>
                        DEPLOYED
                        </b>
                    </div>

                    <div className="docs-contract-address">
                        0x56FC882244f8FB1d05C2171d180872B38800706F
                    </div>
                    </div>

                    <div className="docs-contract-responsibilities">
                    <div>
                        <span>
                        01
                        </span>

                        <strong>
                        CREATE TOKENS
                        </strong>

                        <p>
                        Deploys a new MemeToken for each
                        Fair Launch.
                        </p>
                    </div>

                    <div>
                        <span>
                        02
                        </span>

                        <strong>
                        STORE LAUNCH STATE
                        </strong>

                        <p>
                        Tracks inventory, reserves,
                        transaction count, and status.
                        </p>
                    </div>

                    <div>
                        <span>
                        03
                        </span>

                        <strong>
                        BUY / SELL
                        </strong>

                        <p>
                        Executes Fair Launch bonding-curve
                        trading.
                        </p>
                    </div>

                    <div>
                        <span>
                        04
                        </span>

                        <strong>
                        GRADUATION
                        </strong>

                        <p>
                        Coordinates migration after the
                        graduation condition is reached.
                        </p>
                    </div>
                    </div>
                </section>


                {/* LAUNCH STATE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / LAUNCH STATE
                    </span>

                    <h2>
                    Fair Launch State
                    </h2>

                    <p>
                    Each Fair Launch maintains the state
                    required for trading and graduation.
                    </p>

                    <div className="docs-state-grid">
                    <div>
                        <span>
                        TOKEN
                        </span>

                        <strong>
                        TOKEN ADDRESS
                        </strong>
                    </div>

                    <div>
                        <span>
                        CREATOR
                        </span>

                        <strong>
                        CREATOR ADDRESS
                        </strong>
                    </div>

                    <div>
                        <span>
                        TOTAL SUPPLY
                        </span>

                        <strong>
                        FIXED SUPPLY
                        </strong>
                    </div>

                    <div>
                        <span>
                        BONDING SUPPLY
                        </span>

                        <strong>
                        CURVE INVENTORY
                        </strong>
                    </div>

                    <div>
                        <span>
                        LIQUIDITY SUPPLY
                        </span>

                        <strong>
                        MIGRATION INVENTORY
                        </strong>
                    </div>

                    <div>
                        <span>
                        TOKENS SOLD
                        </span>

                        <strong>
                        LIVE CURVE STATE
                        </strong>
                    </div>

                    <div>
                        <span>
                        QUOTE RESERVE
                        </span>

                        <strong>
                        REAL QUOTE VALUE
                        </strong>
                    </div>

                    <div>
                        <span>
                        STATUS
                        </span>

                        <strong>
                        LAUNCH LIFECYCLE
                        </strong>
                    </div>
                    </div>
                </section>


                {/* MEME TOKEN */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / TOKEN CONTRACT
                    </span>

                    <h2>
                    MemeToken
                    </h2>

                    <p>
                    A new MemeToken contract is deployed for
                    every Fair Launch.
                    </p>

                    <p>
                    LaunchFactory passes the token name,
                    symbol, fixed supply, and creator address
                    when creating the token.
                    </p>

                    <div className="docs-token-construction">
                    <span>
                        CREATION_
                    </span>

                    <strong>
                        MemeToken(
                        name,
                        symbol,
                        supply,
                        creator
                        )
                    </strong>
                    </div>

                    <div className="docs-note">
                    <span>
                        SUPPLY_
                    </span>

                    <p>
                        The Fair Launch flow uses a fixed supply
                        of 1,000,000,000 tokens.
                    </p>
                    </div>
                </section>


                {/* FACTORY INVENTORY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / TOKEN INVENTORY
                    </span>

                    <h2>
                    Factory-Held Supply
                    </h2>

                    <p>
                    The launch flow does not create a separate
                    token allocation specifically for
                    liquidity at deployment time.
                    </p>

                    <p>
                    The physical token supply is available to
                    the Factory, which uses that inventory for
                    Fair Launch purchases and later liquidity
                    migration.
                    </p>

                    <div className="docs-inventory-flow">
                    <div>
                        <span>
                        TOTAL SUPPLY
                        </span>

                        <strong>
                        1,000,000,000
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        FACTORY
                        </span>

                        <strong>
                        TOKEN INVENTORY
                        </strong>
                    </div>

                    <div>
                        →
                    </div>

                    <div>
                        <span>
                        USE
                        </span>

                        <strong>
                        CURVE + LIQUIDITY
                        </strong>
                    </div>
                    </div>
                </section>


                {/* BONDING CURVE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / BONDING CURVE
                    </span>

                    <h2>
                    BondingCurveV3
                    </h2>

                    <p>
                    LaunchFactory delegates Fair Launch
                    mathematical calculations to
                    BondingCurveV3.
                    </p>

                    <div className="docs-contract-function-grid">
                    <div>
                        <span>
                        GRADUATION
                        </span>

                        <strong>
                        graduationTokensSold
                        </strong>

                        <p>
                        Derives the curve inventory required
                        before graduation.
                        </p>
                    </div>

                    <div>
                        <span>
                        BUY
                        </span>

                        <strong>
                        CURVE QUOTE
                        </strong>

                        <p>
                        Determines token output and quote
                        requirements for purchases.
                        </p>
                    </div>

                    <div>
                        <span>
                        SELL
                        </span>

                        <strong>
                        quoteForSell
                        </strong>

                        <p>
                        Calculates quote output when tokens
                        are sold back to the curve.
                        </p>
                    </div>
                    </div>

                    <div className="docs-note">
                    <span>
                        SEPARATION_
                    </span>

                    <p>
                        Pricing mathematics are separated from
                        the Factory's launch-state and asset
                        transfer responsibilities.
                    </p>
                    </div>
                </section>


                {/* MIGRATION ADAPTER */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / MIGRATION
                    </span>

                    <h2>
                    MigrationAdapter
                    </h2>

                    <p>
                    The Factory interacts with a dedicated
                    migration adapter when a Fair Launch is
                    ready to graduate.
                    </p>

                    <div className="docs-contract-card">
                    <div className="docs-contract-card-header">
                        <div>
                        <span>
                            CONTRACT
                        </span>

                        <strong>
                            MigrationAdapter
                        </strong>
                        </div>

                        <b>
                        DEPLOYED
                        </b>
                    </div>

                    <div className="docs-contract-address">
                        0x6Ab39fB0038Be7a4d15914023f813cEB6193A097
                    </div>
                    </div>

                    <p className="docs-contract-followup">
                    LaunchFactory passes the remaining token
                    inventory and accumulated quote reserve
                    to the adapter during migration.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    FACTORY → MIGRATION ADAPTER → LIQUIDITY
                    </div>
                </section>


                {/* MIGRATION BOUNDARY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / TRUST BOUNDARY
                    </span>

                    <h2>
                    Migration Validation
                    </h2>

                    <p>
                    LaunchFactory validates the migration
                    adapter when the Factory is deployed.
                    </p>

                    <div className="docs-validation-grid">
                    <div>
                        <span>
                        ADAPTER ADDRESS
                        </span>

                        <strong>
                        NON-ZERO
                        </strong>
                    </div>

                    <div>
                        <span>
                        ADAPTER TYPE
                        </span>

                        <strong>
                        CONTRACT
                        </strong>
                    </div>

                    <div>
                        <span>
                        LP DESTINATION
                        </span>

                        <strong>
                        EXPECTED BURN ADDRESS
                        </strong>
                    </div>

                    <div>
                        <span>
                        MIGRATION RESULT
                        </span>

                        <strong>
                        NON-ZERO POOL + LP
                        </strong>
                    </div>
                    </div>
                </section>


                {/* LP BURN */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / LP DESTINATION
                    </span>

                    <h2>
                    LP Burn Boundary
                    </h2>

                    <p>
                    The Factory expects the migration adapter
                    to use the protocol-defined LP burn
                    destination.
                    </p>

                    <div className="docs-burn-address-card">
                    <span>
                        EXPECTED LP BURN ADDRESS
                    </span>

                    <strong>
                        0x000000000000000000000000000000000000dEaD
                    </strong>
                    </div>
                </section>


                {/* REENTRANCY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    10 / EXECUTION SAFETY
                    </span>

                    <h2>
                    Transaction Boundaries
                    </h2>

                    <p>
                    LaunchFactory uses a reentrancy guard
                    around state-changing launch, trading,
                    and migration operations.
                    </p>

                    <p>
                    Migration is also atomic: a downstream
                    migration failure causes the transaction
                    to revert instead of committing a partial
                    graduation state.
                    </p>

                    <div className="docs-safety-grid">
                    <div>
                        <span>
                        LAUNCH
                        </span>

                        <strong>
                        NONREENTRANT
                        </strong>
                    </div>

                    <div>
                        <span>
                        BUY
                        </span>

                        <strong>
                        NONREENTRANT
                        </strong>
                    </div>

                    <div>
                        <span>
                        SELL
                        </span>

                        <strong>
                        NONREENTRANT
                        </strong>
                    </div>

                    <div>
                        <span>
                        MIGRATION
                        </span>

                        <strong>
                        NONREENTRANT
                        </strong>
                    </div>
                    </div>
                </section>


                {/* NETWORK */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    11 / DEPLOYMENT
                    </span>

                    <h2>
                    Current Deployment
                    </h2>

                    <div className="docs-deployment-grid">
                    <div>
                        <span>
                        NETWORK
                        </span>

                        <strong>
                        ARC MAINNET
                        </strong>

                        <small>
                        Chain ID 5042
                        </small>
                    </div>

                    <div>
                        <span>
                        LAUNCH FACTORY
                        </span>

                        <strong>
                        0x56FC...706F
                        </strong>

                        <small>
                        Fair Launch protocol
                        </small>
                    </div>

                    <div>
                        <span>
                        MIGRATION ADAPTER
                        </span>

                        <strong>
                        0x6Ab3...A097
                        </strong>

                        <small>
                        Graduation adapter
                        </small>
                    </div>

                    <div>
                        <span>
                        AMM FACTORY
                        </span>

                        <strong>
                        0xF523...1fe6
                        </strong>

                        <small>
                        Current mainnet deployment
                        </small>
                    </div>
                    </div>
                </section>


                {/* SOURCE OF TRUTH */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    12 / SOURCE OF TRUTH
                    </span>

                    <h2>
                    On-Chain Authority
                    </h2>

                    <p>
                    Smart-contract state is authoritative for
                    Fair Launch execution, inventory, reserves,
                    and lifecycle status.
                    </p>

                    <p>
                    Website metadata, indexing, and local cache
                    improve the interface but do not replace
                    the underlying contract state.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        ✓
                    </span>

                    <div>
                        <strong>
                        BLOCKCHAIN = SOURCE OF TRUTH_
                        </strong>

                        <small>
                        Interface data is supplementary to
                        on-chain protocol state.
                        </small>
                    </div>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "SECURITY" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    09 / SECURITY
                </span>

                <h1>
                    SECURITY_
                </h1>

                <p>
                    SEIS TERMINAL is designed around explicit
                    user authorization, limited wallet
                    permissions, and clear separation between
                    on-chain state and interface data.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* WALLET CONTROL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / WALLET CONTROL
                    </span>

                    <h2>
                    Non-Custodial Interaction
                    </h2>

                    <p>
                    SEIS TERMINAL does not custody user
                    private keys, seed phrases, or wallet
                    signing authority.
                    </p>

                    <p>
                    Transactions are authorized through the
                    connected wallet using the wallet's own
                    confirmation interface.
                    </p>

                    <div className="docs-security-grid">
                    <div>
                        <span>
                        PRIVATE KEYS
                        </span>

                        <strong>
                        NOT CUSTODIED
                        </strong>
                    </div>

                    <div>
                        <span>
                        SEED PHRASE
                        </span>

                        <strong>
                        NOT REQUESTED
                        </strong>
                    </div>

                    <div>
                        <span>
                        SIGNING
                        </span>

                        <strong>
                        WALLET CONTROLLED
                        </strong>
                    </div>

                    <div>
                        <span>
                        TRANSACTION APPROVAL
                        </span>

                        <strong>
                        USER CONFIRMED
                        </strong>
                    </div>
                    </div>
                </section>


                {/* EXPLICIT ACTIONS */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / EXPLICIT ACTIONS
                    </span>

                    <h2>
                    Transactions Require User Action
                    </h2>

                    <p>
                    State-changing actions are initiated only
                    after an explicit user interaction in the
                    terminal.
                    </p>

                    <p>
                    Browsing markets, viewing balances, or
                    selecting a token does not itself submit
                    a blockchain transaction.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        ✓
                    </span>

                    <div>
                        <strong>
                        EXPLICIT CONFIRMATION_
                        </strong>

                        <small>
                        Review transaction details in your
                        wallet before approving any action.
                        </small>
                    </div>
                    </div>
                </section>


                {/* WALLET RESTORE */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / SESSION RESTORE
                    </span>

                    <h2>
                    Wallet Session Restoration
                    </h2>

                    <p>
                    SEIS TERMINAL may restore the interface
                    state for a previously connected wallet
                    after a page reload.
                    </p>

                    <p>
                    Session restoration uses read-only wallet
                    account information and does not request
                    a new connection approval automatically.
                    </p>

                    <div className="docs-security-boundary">
                    <span>
                        RESTORE_
                    </span>

                    <strong>
                        READ-ONLY ACCOUNT CHECK
                    </strong>

                    <p>
                        Reloading the page does not automatically
                        request transaction signatures.
                    </p>
                    </div>
                </section>


                {/* BUY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / BUY APPROVAL
                    </span>

                    <h2>
                    Buy Transactions
                    </h2>

                    <p>
                    The current Fair Launch BUY flow uses the
                    network quote asset directly with the
                    LaunchFactory.
                    </p>

                    <p>
                    A separate ERC-20 token approval is not
                    required before submitting a BUY through
                    the current Fair Launch flow.
                    </p>

                    <div className="docs-security-policy-card">
                    <span>
                        BUY_
                    </span>

                    <strong>
                        NO ERC-20 APPROVAL
                    </strong>

                    <p>
                        The wallet still requires confirmation
                        for the actual blockchain transaction.
                    </p>
                    </div>
                </section>


                {/* SELL */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / SELL APPROVAL
                    </span>

                    <h2>
                    Exact-Amount Sell Approval
                    </h2>

                    <p>
                    Selling requires the Fair Launch contract
                    to transfer the selected token amount from
                    the user's wallet.
                    </p>

                    <p>
                    SEIS TERMINAL uses an exact-amount approval
                    policy for this flow rather than requesting
                    an unlimited token allowance.
                    </p>

                    <div className="docs-approval-comparison">
                    <div className="docs-approval-good">
                        <span>
                        CURRENT POLICY
                        </span>

                        <strong>
                        EXACT AMOUNT
                        </strong>

                        <small>
                        Limited to the amount required for
                        the selected sell.
                        </small>
                    </div>

                    <div className="docs-approval-disabled">
                        <span>
                        NOT USED
                        </span>

                        <strong>
                        UNLIMITED APPROVAL
                        </strong>

                        <small>
                        SEIS TERMINAL does not request
                        MaxUint256 approval for this flow.
                        </small>
                    </div>
                    </div>
                </section>


                {/* PROVIDER */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / WALLET PROVIDER
                    </span>

                    <h2>
                    Selected Wallet Provider
                    </h2>

                    <p>
                    Transactions are sent through the wallet
                    provider explicitly selected by the user.
                    </p>

                    <p>
                    SEIS TERMINAL does not rely on an arbitrary
                    global wallet provider when executing
                    wallet actions.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    SELECTED WALLET → EIP-1193 PROVIDER → TRANSACTION
                    </div>
                </section>


                {/* CONTRACT SAFETY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / CONTRACT EXECUTION
                    </span>

                    <h2>
                    Reentrancy Protection
                    </h2>

                    <p>
                    LaunchFactory applies reentrancy protection
                    to state-changing launch, buy, sell, and
                    migration operations.
                    </p>

                    <div className="docs-safety-grid">
                    <div>
                        <span>
                        LAUNCH
                        </span>

                        <strong>
                        PROTECTED
                        </strong>
                    </div>

                    <div>
                        <span>
                        BUY
                        </span>

                        <strong>
                        PROTECTED
                        </strong>
                    </div>

                    <div>
                        <span>
                        SELL
                        </span>

                        <strong>
                        PROTECTED
                        </strong>
                    </div>

                    <div>
                        <span>
                        MIGRATION
                        </span>

                        <strong>
                        PROTECTED
                        </strong>
                    </div>
                    </div>
                </section>


                {/* MIGRATION SAFETY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / MIGRATION SAFETY
                    </span>

                    <h2>
                    Atomic Graduation
                    </h2>

                    <p>
                    Liquidity migration is designed to execute
                    atomically.
                    </p>

                    <p>
                    If the migration adapter or downstream
                    operation fails, the transaction reverts
                    instead of leaving the launch in a
                    partially completed graduation state.
                    </p>

                    <div className="docs-security-policy-card">
                    <span>
                        MIGRATION_
                    </span>

                    <strong>
                        SUCCESS OR FULL REVERT
                    </strong>

                    <p>
                        Intermediate state changes do not remain
                        committed when migration fails.
                    </p>
                    </div>
                </section>


                {/* ADAPTER VALIDATION */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / ADAPTER BOUNDARY
                    </span>

                    <h2>
                    Migration Adapter Validation
                    </h2>

                    <p>
                    LaunchFactory validates the migration
                    adapter configuration when the Factory is
                    deployed.
                    </p>

                    <div className="docs-validation-grid">
                    <div>
                        <span>
                        ADDRESS
                        </span>

                        <strong>
                        NON-ZERO
                        </strong>
                    </div>

                    <div>
                        <span>
                        CODE
                        </span>

                        <strong>
                        CONTRACT REQUIRED
                        </strong>
                    </div>

                    <div>
                        <span>
                        LP DESTINATION
                        </span>

                        <strong>
                        EXPECTED BURN ADDRESS
                        </strong>
                    </div>

                    <div>
                        <span>
                        MIGRATION OUTPUT
                        </span>

                        <strong>
                        VALIDATED
                        </strong>
                    </div>
                    </div>
                </section>


                {/* DATA BOUNDARY */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    10 / DATA BOUNDARY
                    </span>

                    <h2>
                    On-Chain State vs Interface Data
                    </h2>

                    <p>
                    Blockchain state is authoritative for
                    launch status, reserves, balances, and
                    transaction settlement.
                    </p>

                    <p>
                    Off-chain services are used for interface
                    features such as token logos, indexed
                    trading activity, charts, and cached
                    display data.
                    </p>

                    <div className="docs-security-data-grid">
                    <div>
                        <span>
                        ON-CHAIN
                        </span>

                        <strong>
                        AUTHORITATIVE_
                        </strong>

                        <p>
                        Asset state, reserves, launch status,
                        and transaction execution.
                        </p>
                    </div>

                    <div>
                        <span>
                        OFF-CHAIN
                        </span>

                        <strong>
                        SUPPLEMENTARY_
                        </strong>

                        <p>
                        Metadata, indexing, charts, and
                        interface caching.
                        </p>
                    </div>
                    </div>
                </section>


                {/* FAILURE ISOLATION */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    11 / FAILURE ISOLATION
                    </span>

                    <h2>
                    Indexing Does Not Define Transaction Success
                    </h2>

                    <p>
                    An on-chain transaction can succeed even
                    if a metadata or indexing service becomes
                    temporarily unavailable.
                    </p>

                    <p>
                    SEIS TERMINAL separates confirmed
                    blockchain execution from auxiliary
                    interface indexing.
                    </p>

                    <div className="docs-terminal-box">
                    <span className="docs-terminal-prompt">
                        ✓
                    </span>

                    <div>
                        <strong>
                        ON-CHAIN RECEIPT = TRANSACTION RESULT_
                        </strong>

                        <small>
                        Interface indexing failure does not
                        reverse a confirmed blockchain
                        transaction.
                        </small>
                    </div>
                    </div>
                </section>


                {/* RISK */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    12 / USER RESPONSIBILITY
                    </span>

                    <h2>
                    Transaction Risk
                    </h2>

                    <p>
                    Smart contracts, wallets, blockchain
                    networks, token markets, and third-party
                    infrastructure can all involve risk.
                    </p>

                    <p>
                    Users should verify token addresses,
                    transaction parameters, wallet prompts,
                    and network selection before confirming
                    a transaction.
                    </p>

                    <div className="docs-risk-card">
                    <span>
                        IMPORTANT_
                    </span>

                    <strong>
                        REVIEW BEFORE YOU SIGN
                    </strong>

                    <p>
                        Do not approve a transaction you do not
                        understand or that does not match the
                        action you intended to perform.
                    </p>
                    </div>
                </section>


                {/* NO ABSOLUTE CLAIM */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    13 / SECURITY MODEL
                    </span>

                    <h2>
                    Security is a Boundary, Not a Guarantee
                    </h2>

                    <p>
                    SEIS TERMINAL uses defensive wallet and
                    contract interaction patterns to reduce
                    unnecessary permissions and limit attack
                    surface.
                    </p>

                    <p>
                    These controls reduce risk but do not make
                    any blockchain application immune to bugs,
                    network failures, wallet compromise, or
                    other security threats.
                    </p>

                    <div className="docs-security-summary">
                    <strong>
                        MINIMIZE PERMISSIONS_
                    </strong>

                    <span>
                        EXPLICIT ACTIONS
                    </span>

                    <span>
                        LIMITED APPROVALS
                    </span>

                    <span>
                        ON-CHAIN VERIFICATION
                    </span>

                    <span>
                        ATOMIC STATE TRANSITIONS
                    </span>
                    </div>
                </section>

                </article>
            </>
            )}

            {activeSection === "FAQ" && (
            <>
                <div className="docs-hero">
                <span className="docs-kicker">
                    10 / FAQ
                </span>

                <h1>
                    FAQ_
                </h1>

                <p>
                    Quick answers to common questions about
                    launching, trading, wallets, and the
                    SEIS TERMINAL Fair Launch protocol.
                </p>
                </div>

                <div className="docs-divider" />

                <article className="docs-article">

                {/* 01 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    01 / GENERAL
                    </span>

                    <h2>
                    What is SEIS TERMINAL?
                    </h2>

                    <p>
                    SEIS TERMINAL is a lightweight token
                    launch and trading terminal built around
                    a predefined Fair Launch protocol.
                    </p>

                    <p>
                    Users can create tokens, discover active
                    launches, and buy or sell tokens directly
                    through the terminal.
                    </p>
                </section>


                {/* 02 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    02 / NETWORK
                    </span>

                    <h2>
                    Which network does SEIS TERMINAL use?
                    </h2>

                    <p>
                    The current deployment operates on
                    ARC Mainnet.
                    </p>

                    <div className="docs-faq-info-grid">
                    <div>
                        <span>
                        NETWORK
                        </span>

                        <strong>
                        ARC MAINNET
                        </strong>
                    </div>

                    <div>
                        <span>
                        CHAIN ID
                        </span>

                        <strong>
                        5042
                        </strong>
                    </div>

                    <div>
                        <span>
                        QUOTE ASSET
                        </span>

                        <strong>
                        USDC
                        </strong>
                    </div>
                    </div>
                </section>


                {/* 03 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    03 / WALLET
                    </span>

                    <h2>
                    Does SEIS TERMINAL hold my private keys?
                    </h2>

                    <p>
                    No. SEIS TERMINAL does not custody private
                    keys or seed phrases.
                    </p>

                    <p>
                    Wallet authorization and transaction
                    signing remain under the control of the
                    connected wallet.
                    </p>
                </section>


                {/* 04 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    04 / TOKEN SUPPLY
                    </span>

                    <h2>
                    Can I choose the token supply?
                    </h2>

                    <p>
                    No. The current Fair Launch protocol uses
                    a fixed total supply of
                    1,000,000,000 tokens for every launch.
                    </p>

                    <div className="docs-faq-answer-card">
                    <span>
                        FIXED SUPPLY_
                    </span>

                    <strong>
                        1,000,000,000 TOKENS
                    </strong>
                    </div>
                </section>


                {/* 05 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    05 / MARKET CAP
                    </span>

                    <h2>
                    Can creators choose the starting market cap?
                    </h2>

                    <p>
                    No. The current Fair Launch configuration
                    uses protocol-defined initial and
                    graduation market-cap parameters.
                    </p>

                    <div className="docs-faq-info-grid">
                    <div>
                        <span>
                        INITIAL
                        </span>

                        <strong>
                        $10,000
                        </strong>
                    </div>

                    <div>
                        <span>
                        GRADUATION
                        </span>

                        <strong>
                        $60,000
                        </strong>
                    </div>
                    </div>
                </section>


                {/* 06 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    06 / DEV BUY
                    </span>

                    <h2>
                    Is the developer buy a free allocation?
                    </h2>

                    <p>
                    No. The optional developer buy is a real
                    purchase through the Fair Launch bonding
                    curve.
                    </p>

                    <p>
                    It uses quote value supplied by the creator
                    and receives tokens according to the curve
                    state.
                    </p>

                    <div className="docs-note">
                    <span>
                        LIMIT_
                    </span>

                    <p>
                        The current launch-time developer buy is
                        limited to a maximum of 5% of total
                        token supply.
                    </p>
                    </div>
                </section>


                {/* 07 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    07 / LOGO
                    </span>

                    <h2>
                    Is a token logo required?
                    </h2>

                    <p>
                    No. A token logo is optional metadata used
                    by the SEIS TERMINAL interface.
                    </p>

                    <p>
                    The token contract can still be created
                    without uploading a logo.
                    </p>
                </section>


                {/* 08 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    08 / BUY
                    </span>

                    <h2>
                    Do I need an ERC-20 approval before buying?
                    </h2>

                    <p>
                    No separate ERC-20 token approval is
                    required for the current Fair Launch BUY
                    flow.
                    </p>

                    <p>
                    The actual purchase transaction still
                    requires confirmation in the connected
                    wallet.
                    </p>
                </section>


                {/* 09 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    09 / SELL
                    </span>

                    <h2>
                    Why does selling require an approval?
                    </h2>

                    <p>
                    The Fair Launch contract must be authorized
                    to transfer the selected token amount from
                    the seller's wallet.
                    </p>

                    <p>
                    SEIS TERMINAL uses an exact-amount approval
                    policy for the sell flow rather than an
                    unlimited allowance.
                    </p>
                </section>


                {/* 10 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    10 / PRICE
                    </span>

                    <h2>
                    How is the Fair Launch price determined?
                    </h2>

                    <p>
                    The Fair Launch uses a constant-product
                    virtual reserve model.
                    </p>

                    <p>
                    As tokens are bought and sold, the reserve
                    state changes and the current spot price
                    moves along the bonding curve.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    PRICE = VIRTUAL QUOTE RESERVE / VIRTUAL TOKEN RESERVE
                    </div>
                </section>


                {/* 11 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    11 / GRADUATION
                    </span>

                    <h2>
                    What happens when a token graduates?
                    </h2>

                    <p>
                    Once the Fair Launch reaches its
                    graduation condition, bonding-curve
                    trading ends and the launch becomes
                    eligible for liquidity migration.
                    </p>

                    <p>
                    After successful migration, the launch
                    status becomes GRADUATED.
                    </p>

                    <div className="docs-command">
                    <span>
                        &gt;
                    </span>

                    ACTIVE → GRADUATING → GRADUATED
                    </div>
                </section>


                {/* 12 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    12 / MIGRATION
                    </span>

                    <h2>
                    Does the creator have to perform graduation?
                    </h2>

                    <p>
                    No. Once the launch is eligible, the
                    migration function can be called
                    permissionlessly.
                    </p>

                    <p>
                    Graduation therefore does not depend on
                    the original creator remaining online.
                    </p>
                </section>


                {/* 13 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    13 / LP
                    </span>

                    <h2>
                    What happens to the liquidity position?
                    </h2>

                    <p>
                    The current Factory expects the migration
                    adapter to use the configured LP burn
                    destination.
                    </p>

                    <div className="docs-burn-address-card">
                    <span>
                        EXPECTED LP BURN ADDRESS
                    </span>

                    <strong>
                        0x000000000000000000000000000000000000dEaD
                    </strong>
                    </div>
                </section>


                {/* 14 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    14 / DATA
                    </span>

                    <h2>
                    Is everything shown in the terminal stored on-chain?
                    </h2>

                    <p>
                    No. Core protocol state and transaction
                    execution are on-chain, while some
                    interface features use off-chain services.
                    </p>

                    <div className="docs-security-data-grid">
                    <div>
                        <span>
                        ON-CHAIN
                        </span>

                        <strong>
                        PROTOCOL STATE_
                        </strong>

                        <p>
                        Launch status, reserves, token
                        inventory, and transaction execution.
                        </p>
                    </div>

                    <div>
                        <span>
                        OFF-CHAIN
                        </span>

                        <strong>
                        INTERFACE DATA_
                        </strong>

                        <p>
                        Logos, indexed activity, charts,
                        metadata, and cache.
                        </p>
                    </div>
                    </div>
                </section>


                {/* 15 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    15 / TRANSACTION STATUS
                    </span>

                    <h2>
                    What if the interface fails after my transaction succeeds?
                    </h2>

                    <p>
                    A confirmed blockchain transaction remains
                    valid even if a metadata or indexing
                    service temporarily fails afterward.
                    </p>

                    <p>
                    The on-chain transaction receipt determines
                    blockchain execution; auxiliary interface
                    indexing does not reverse it.
                    </p>
                </section>


                {/* 16 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    16 / SWAP
                    </span>

                    <h2>
                    Is SWAP available?
                    </h2>

                    <p>
                    SWAP is not part of the currently documented
                    Fair Launch workflow.
                    </p>

                    <p>
                    Features that are not active should not be
                    assumed to be available until they are
                    explicitly released.
                    </p>
                </section>


                {/* 17 */}

                <section className="docs-section">
                    <span className="docs-step-label">
                    17 / RISK
                    </span>

                    <h2>
                    Is trading on SEIS TERMINAL risk-free?
                    </h2>

                    <p>
                    No. Token markets, smart contracts,
                    wallets, blockchain networks, and external
                    infrastructure can involve significant
                    risk.
                    </p>

                    <p>
                    Users should verify addresses, network
                    selection, token details, and wallet
                    transaction prompts before confirming.
                    </p>

                    <div className="docs-risk-card">
                    <span>
                        REMINDER_
                    </span>

                    <strong>
                        VERIFY BEFORE YOU SIGN
                    </strong>

                    <p>
                        Only authorize transactions that match
                        the action you intended to perform.
                    </p>
                    </div>
                </section>


                {/* END */}

                <section className="docs-section">
                    <div className="docs-faq-end">
                    <span>
                        END OF DOCUMENTATION_
                    </span>

                    <strong>
                        SEIS TERMINAL DOCS v1
                    </strong>

                    <p>
                        Protocol documentation reflects the
                        current testnet implementation and may
                        be updated as the protocol evolves.
                    </p>
                    </div>
                </section>

                </article>
            </>
            )}
        </section>
    </div>
  );
}

export default DocsPage;