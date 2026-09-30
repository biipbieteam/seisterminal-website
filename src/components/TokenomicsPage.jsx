import "./TokenomicsPage.css";

const tokenDistribution = [
  {
    allocation: "DEX Liquidity",
    percentage: "30%",
    amount: "300,000,000",
  },
  {
    allocation: "CEX / Market Making",
    percentage: "15%",
    amount: "150,000,000",
  },
  {
    allocation: "NFT Staking Rewards",
    percentage: "15%",
    amount: "150,000,000",
  },
  {
    allocation: "Public / Whitelist Mint",
    percentage: "15%",
    amount: "150,000,000",
  },
  {
    allocation: "Treasury / Ecosystem",
    percentage: "10%",
    amount: "100,000,000",
  },
  {
    allocation: "Genesis Holder Airdrop",
    percentage: "5%",
    amount: "50,000,000",
  },
  {
    allocation: "Team Vesting",
    percentage: "10%",
    amount: "100,000,000",
  },
];

const genesisExamples = [
  ["1 NFT", "100,000 SEIS"],
  ["2 NFTs", "200,000 SEIS"],
  ["5 NFTs", "500,000 SEIS"],
  ["10 NFTs", "1,000,000 SEIS"],
  ["20 NFTs", "2,000,000 SEIS"],
  ["50 NFTs", "5,000,000 SEIS"],
];

export default function TokenomicsPage() {
  return (
    <main className="tokenomics-page">
      <header className="tokenomics-header">
        <div>
          <div className="tokenomics-eyebrow">
            &gt; SEIS ECONOMICS_
          </div>

          <h1>
            TOKENOMICS
          </h1>

          <p>
            SEIS has a fixed total supply of
            1,000,000,000 tokens, allocated
            across liquidity, market growth,
            ecosystem incentives, Genesis
            holders and long-term team
            development.
          </p>
        </div>

        <div className="tokenomics-supply">
          <span>
            TOTAL SUPPLY
          </span>

          <strong>
            1,000,000,000
          </strong>

          <small>
            SEIS
          </small>
        </div>
      </header>

      <section className="tokenomics-section">
        <div className="tokenomics-section-heading">
          <span>
            01
          </span>

          <div>
            <h2>
              TOKEN DISTRIBUTION_
            </h2>

            <p>
              Initial allocation of the fixed
              SEIS supply.
            </p>
          </div>
        </div>

        <div className="tokenomics-table-wrap">
          <table className="tokenomics-table">
            <thead>
              <tr>
                <th>
                  ALLOCATION
                </th>

                <th>
                  %
                </th>

                <th>
                  SEIS
                </th>
              </tr>
            </thead>

            <tbody>
              {tokenDistribution.map(
                (item) => (
                  <tr key={item.allocation}>
                    <td>
                      {item.allocation}
                    </td>

                    <td>
                      {item.percentage}
                    </td>

                    <td>
                      {item.amount}
                    </td>
                  </tr>
                )
              )}

              <tr className="tokenomics-total-row">
                <td>
                  TOTAL SUPPLY
                </td>

                <td>
                  100%
                </td>

                <td>
                  1,000,000,000
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="tokenomics-section">
        <div className="tokenomics-section-heading">
          <span>
            02
          </span>

          <div>
            <h2>
              GENESIS HOLDER AIRDROP_
            </h2>

            <p>
              A dedicated allocation for the
              earliest SEIS Genesis holders.
            </p>
          </div>
        </div>

        <div className="tokenomics-stat-grid">
          <div className="tokenomics-stat">
            <span>
              AIRDROP POOL
            </span>

            <strong>
              50M
            </strong>

            <small>
              SEIS
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              PER GENESIS NFT
            </span>

            <strong>
              100K
            </strong>

            <small>
              SEIS
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              MAX GENESIS
            </span>

            <strong>
              470
            </strong>

            <small>
              NFTs
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              WALLET CAP
            </span>

            <strong>
              NONE
            </strong>

            <small>
              PER NFT MODEL
            </small>
          </div>
        </div>

        <div className="tokenomics-info-panel">
          <p>
            Every eligible Genesis NFT counts
            individually. Each Genesis NFT held
            at the designated snapshot receives
            <strong> 100,000 SEIS</strong>, with
            no maximum allocation per wallet.
          </p>

          <p>
            The distribution rewards Genesis
            holders proportionally: the more
            Genesis NFTs held, the larger the
            SEIS allocation.
          </p>

          <p>
            With a maximum supply of 470 Genesis
            NFTs, the base distribution can
            reach up to
            <strong> 47,000,000 SEIS</strong>.
            The remaining
            <strong> 3,000,000 SEIS</strong>
            is reserved for future
            Genesis-related incentives and
            rewards.
          </p>
        </div>

        <div className="tokenomics-holder-table">
          {genesisExamples.map(
            ([nfts, allocation]) => (
              <div
                className="tokenomics-holder-row"
                key={nfts}
              >
                <span>
                  {nfts}
                </span>

                <strong>
                  {allocation}
                </strong>
              </div>
            )
          )}
        </div>

        <div className="tokenomics-callout">
          <span>
            GENESIS MODEL_
          </span>

          <strong>
            1 GENESIS NFT = 100,000 SEIS
          </strong>

          <small>
            MORE GENESIS HELD = LARGER SEIS
            ALLOCATION · NO WALLET CAP
          </small>
        </div>
      </section>

      <section className="tokenomics-section">
        <div className="tokenomics-section-heading">
          <span>
            03
          </span>

          <div>
            <h2>
              TEAM VESTING_
            </h2>

            <p>
              Long-term alignment between the
              SEIS team and ecosystem.
            </p>
          </div>
        </div>

        <div className="tokenomics-stat-grid">
          <div className="tokenomics-stat">
            <span>
              TEAM ALLOCATION
            </span>

            <strong>
              100M
            </strong>

            <small>
              SEIS
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              SUPPLY
            </span>

            <strong>
              10%
            </strong>

            <small>
              TOTAL SUPPLY
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              VESTING
            </span>

            <strong>
              12
            </strong>

            <small>
              MONTHS
            </small>
          </div>

          <div className="tokenomics-stat">
            <span>
              INITIAL UNLOCK
            </span>

            <strong>
              0%
            </strong>

            <small>
              AT START
            </small>
          </div>
        </div>

        <div className="tokenomics-info-panel">
          <p>
            The team allocation represents
            <strong> 10% of the total SEIS
            supply</strong> and follows a
            <strong> 12-month linear vesting
            schedule</strong>.
          </p>

          <p>
            No team tokens are unlocked at the
            beginning of the vesting period.
            The allocation is progressively
            released over 12 months, preventing
            the entire team allocation from
            entering circulation at once.
          </p>
        </div>

        <div className="tokenomics-vesting">
          <div className="tokenomics-vesting-labels">
            <span>
              MONTH 0
              <strong>
                0
              </strong>
            </span>

            <span>
              MONTH 3
              <strong>
                25M
              </strong>
            </span>

            <span>
              MONTH 6
              <strong>
                50M
              </strong>
            </span>

            <span>
              MONTH 9
              <strong>
                75M
              </strong>
            </span>

            <span>
              MONTH 12
              <strong>
                100M
              </strong>
            </span>
          </div>

          <div className="tokenomics-vesting-track">
            <div className="tokenomics-vesting-fill" />
          </div>

          <div className="tokenomics-vesting-note">
            LINEAR RELEASE · APPROX. 8.33% OF
            TEAM ALLOCATION PER MONTH
          </div>
        </div>
      </section>
    </main>
  );
}