import * as React from 'react'
import { Account } from '../../models/account'
import { GitProvider, getProviderDisplayName, getProviderConfig } from '../../models/git-provider'
import { Button } from '../lib/button'
import { Row } from '../lib/row'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { Avatar } from '../lib/avatar'
import { lookupPreferredEmail } from '../../lib/email'

interface IAccountSwitcherProps {
  /** All accounts */
  readonly accounts: ReadonlyArray<Account>
  /** Currently active account */
  readonly activeAccount: Account | null
  /** Called when user selects an account */
  readonly onAccountSelect: (account: Account) => void
  /** Called when user wants to add a new account */
  readonly onAddAccount: () => void
  /** Called when user wants to manage accounts */
  readonly onManageAccounts: () => void
  /** Whether the switcher is in a foldout/dropdown */
  readonly isFoldoutOpen: boolean
  /** Called when the foldout should be toggled */
  readonly onFoldoutToggle: () => void
}

interface IAccountListItemProps {
  readonly account: Account
  readonly isActive: boolean
  readonly onSelect: (account: Account) => void
}

/**
 * Individual account list item
 */
class AccountListItem extends React.Component<IAccountListItemProps, {}> {
  private onClick = () => {
    this.props.onSelect(this.props.account)
  }

  public render() {
    const { account, isActive } = this.props
    const providerConfig = getProviderConfig(account.provider)
    const displayName = account.displayName

    return (
      <div
        className={`account-list-item ${isActive ? 'active' : ''}`}
        onClick={this.onClick}
      >
        <Row className="account-row">
          <Avatar
            user={{
              email: lookupPreferredEmail(account),
              name: account.name,
              avatarURL: account.avatarURL,
              endpoint: account.endpoint,
            }}
            accounts={[account]}
            title={displayName}
          />
          <div className="account-info">
            <div className="account-name" title={displayName}>
              {displayName}
            </div>
            <div className="account-provider" title={getProviderDisplayName(account.provider)}>
              <span
                className="provider-indicator"
                style={{ backgroundColor: providerConfig.brandColor }}
              />
              {getProviderDisplayName(account.provider)}
              {account.endpoint && account.provider !== 'github' && (
                <span className="account-endpoint"> • {new URL(account.endpoint).hostname}</span>
              )}
            </div>
            <div className="account-login" title={account.login}>
              @{account.login}
            </div>
          </div>
          {isActive && (
            <Octicon
              className="active-indicator"
              symbol={octicons.check}
            />
          )}
        </Row>
      </div>
    )
  }
}

/**
 * Account Switcher component
 * Shows the active account and allows switching between accounts
 */
export class AccountSwitcher extends React.Component<IAccountSwitcherProps, {}> {
  private onAddAccount = () => {
    this.props.onAddAccount()
  }

  private onManageAccounts = () => {
    this.props.onManageAccounts()
  }

  private onAccountSelect = (account: Account) => {
    this.props.onAccountSelect(account)
  }

  public render() {
    const { activeAccount, accounts, isFoldoutOpen } = this.props

    // Group accounts by provider
    const accountsByProvider = this.groupAccountsByProvider(accounts)

    return (
      <div className="account-switcher">
        <Button
          className="account-switcher-button"
          onClick={this.props.onFoldoutToggle}
          disabled={accounts.length === 0}
        >
          {activeAccount ? (
            <Row className="active-account-summary">
              <Avatar
                user={{
                  email: lookupPreferredEmail(activeAccount),
                  name: activeAccount.name,
                  avatarURL: activeAccount.avatarURL,
                  endpoint: activeAccount.endpoint,
                }}
                accounts={[activeAccount]}
                title={activeAccount.displayName}
                size={20}
              />
              <span className="active-account-name">
                {activeAccount.displayName}
              </span>
              <Octicon
                symbol={isFoldoutOpen ? octicons.chevronUp : octicons.chevronDown}
              />
            </Row>
          ) : (
            <Row className="no-account">
              <Octicon symbol={octicons.person} />
              <span>Sign in</span>
            </Row>
          )}
        </Button>

        {isFoldoutOpen && (
          <div className="account-switcher-foldout">
            <div className="account-list">
              {Object.entries(accountsByProvider).map(([provider, providerAccounts]) => (
                <div key={provider} className="provider-group">
                  <div className="provider-header">
                    {getProviderDisplayName(provider as GitProvider)}
                  </div>
                  {providerAccounts.map(account => (
                    <AccountListItem
                      key={account.accountId}
                      account={account}
                      isActive={activeAccount?.accountId === account.accountId}
                      onSelect={this.onAccountSelect}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="account-switcher-actions">
              <Button className="add-account-button" onClick={this.onAddAccount}>
                <Octicon symbol={octicons.plus} />
                <span>Add Account</span>
              </Button>
              <Button className="manage-accounts-button" onClick={this.onManageAccounts}>
                <Octicon symbol={octicons.gear} />
                <span>Manage Accounts</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Group accounts by their provider for organized display
   */
  private groupAccountsByProvider(
    accounts: ReadonlyArray<Account>
  ): Record<string, Account[]> {
    return accounts.reduce((groups, account) => {
      const provider = account.provider
      if (!groups[provider]) {
        groups[provider] = []
      }
      groups[provider].push(account)
      return groups
    }, {} as Record<string, Account[]>)
  }
}
