# TPT GitCastle Desktop - Fork of GitHub Desktop

## Overview
Forking GitHub Desktop to create "TPT GitCastle Desktop" with multi-account support across multiple Git providers and 8 new differentiating features.

## Rebranding ✅ COMPLETE
- [x] Updated package.json repository URL to PhillipC05/tpt-gitcastle
- [x] Updated app/package.json with new name, productName, bundleID
- [x] Updated author and company information

## Multi-Account Support ✅ COMPLETE

### Phase 1: Core Multi-Account Support ✅ COMPLETE
- [x] 1.1 Update Account model with unique accountId and profileName
- [x] 1.2 Refactor AccountsStore to support multiple accounts per endpoint
- [x] 1.3 Update AppState with activeAccount tracking
- [x] 1.4 Update account equality checks and sorting logic
- [x] 1.5 Update secure storage to use accountId-based keys
- [x] 1.6 Update auth.ts to use accountId for secure storage keys
- [x] 1.7 Create migration logic for existing single-account users

### Phase 2: Provider System Architecture ✅ COMPLETE
- [x] 2.1 Create GitProvider interface/abstraction
- [x] 2.2 Implement GitHub provider (existing functionality)
- [x] 2.3 Implement GitHub Enterprise provider (existing functionality)
- [x] 2.4 Create TPT GitCastle provider stub
- [x] 2.5 Update API layer to use provider pattern
- [x] 2.6 Update authentication flows for provider-specific OAuth

### Phase 3: UI Modernization ✅ COMPLETE
- [x] 3.1 Create AccountSwitcher component
- [x] 3.2 Add SCSS styles for account switcher
- [x] 3.3 Create AccountSwitcher index export
- [x] 3.4 Integrate styles into main UI stylesheet

## 8 New Differentiating Features 🚧 IN PROGRESS

### Phase 1: Repository Groups ✅ COMPLETE
- [x] 1.1 Create RepositoryGroup model with color, order, collapse support
- [x] 1.2 Create RepositoryGroupsStore with CRUD operations
- [x] 1.3 Create RepositoryGroupsList UI component with drag-and-drop
- [x] 1.4 Add full SCSS styling with dark theme and high contrast support

### Phase 2: Repository Health Dashboard ✅ COMPLETE
- [x] 2.1 Create RepositoryHealthDashboard component
- [x] 2.2 Add status cards with uncommitted/unpushed/behind indicators
- [x] 2.3 Add Fetch All and Sync All bulk actions
- [x] 2.4 Add full SCSS styling

### Phase 3: Bulk Operations ✅ COMPLETE
- [x] 3.1 Create BulkOperationsPanel component
- [x] 3.2 Add multi-select repository list with checkboxes
- [x] 3.3 Add bulk fetch/pull/push/discard operations
- [x] 3.4 Add confirmation dialogs and progress tracking
- [x] 3.5 Add full SCSS styling

### Phase 4: Commit Message Templates ✅ COMPLETE
- [x] 4.1 Create CommitMessageTemplate model with variable support
- [x] 4.2 Create CommitTemplateStore for persistence
- [x] 4.3 Create CommitTemplatePicker UI component
- [x] 4.4 Add built-in templates: Simple, Conventional Commits, Jira
- [x] 4.5 Add full SCSS styling

### Phase 5: Advanced Stash Management 🚧 IN PROGRESS
- [ ] 5.1 Create StashEntry model extensions
- [ ] 5.2 Create StashManagerStore
- [ ] 5.3 Create StashManager UI component
- [ ] 5.4 Add stash naming, descriptions, and search
- [ ] 5.5 Add full SCSS styling

### Phase 6: Better Submodule Support 🚧 PENDING
- [ ] 6.1 Create Submodule model
- [ ] 6.2 Create SubmoduleStore
- [ ] 6.3 Create SubmoduleManager UI component
- [ ] 6.4 Add submodule status indicators
- [ ] 6.5 Add full SCSS styling

### Phase 7: Repository Templates 🚧 PENDING
- [ ] 7.1 Create RepositoryTemplate model
- [ ] 7.2 Create RepositoryTemplateStore
- [ ] 7.3 Create template creation wizard
- [ ] 7.4 Add template marketplace integration
- [ ] 7.5 Add full SCSS styling

### Phase 8: Branch Comparison Tool 🚧 PENDING
- [ ] 8.1 Create BranchComparison model
- [ ] 8.2 Create BranchComparisonStore
- [ ] 8.3 Create BranchComparison UI component
- [ ] 8.4 Add visual diff of branch contents
- [ ] 8.5 Add full SCSS styling

## Provider Support Matrix

| Provider | OAuth | Token Auth | API Compatible | Status |
|----------|-------|------------|----------------|--------|
| GitHub.com | ✓ | ✓ | Native | Existing |
| GitHub Enterprise | ✓ | ✓ | Native | Existing |
| TPT GitCastle | ? | ? | Building | Planned |
| GitLab | ✓ | ✓ | Partial | Future |
| Gitea | ✓ | ✓ | GitHub API | Future |
| Forgejo | ✓ | ✓ | GitHub API | Future |

## Key Files Created/Modified

### Core Models & Stores ✅ DONE
- ✅ `app/src/models/account.ts` - Account model with provider support
- ✅ `app/src/lib/auth.ts` - Updated to use account.storageKey
- ✅ `app/src/models/git-provider.ts` - New: Provider interface
- ✅ `app/src/lib/stores/accounts-store.ts` - Multi-account storage
- ✅ `app/src/lib/app-state.ts` - Active account tracking

### Provider System ✅ COMPLETE
- ✅ `app/src/lib/providers/` - New: Provider implementations
- ✅ `app/src/lib/providers/provider-interface.ts` - IGitProvider interface
- ✅ `app/src/lib/providers/github-provider.ts` - GitHub implementation
- ✅ `app/src/lib/providers/gitcastle-provider.ts` - GitCastle implementation
- ✅ `app/src/lib/providers/provider-factory.ts` - Provider factory
- ✅ `app/src/lib/api.ts` - Refactor to use providers

### UI Components ✅ COMPLETE
- ✅ `app/src/ui/account-switcher/account-switcher.tsx` - New: Account switching UI
- ✅ `app/src/ui/account-switcher/index.ts` - Export for AccountSwitcher
- ✅ `app/styles/ui/_account-switcher.scss` - Styles for account switcher
- ✅ `app/styles/_ui.scss` - Added account-switcher import

### Feature 1: Repository Groups ✅ COMPLETE
- ✅ `app/src/models/repository-group.ts` - RepositoryGroup model
- ✅ `app/src/lib/stores/repository-groups-store.ts` - RepositoryGroupsStore
- ✅ `app/src/ui/repository-groups/repository-groups-list.tsx` - UI component
- ✅ `app/src/ui/repository-groups/index.ts` - Export
- ✅ `app/styles/ui/_repository-groups.scss` - Styles

### Feature 2: Repository Health Dashboard ✅ COMPLETE
- ✅ `app/src/ui/dashboard/repository-health-dashboard.tsx` - Dashboard component
- ✅ `app/src/ui/dashboard/index.ts` - Export
- ✅ `app/styles/ui/_repository-dashboard.scss` - Styles

### Feature 3: Bulk Operations ✅ COMPLETE
- ✅ `app/src/ui/bulk-operations/bulk-operations-panel.tsx` - Bulk operations panel
- ✅ `app/src/ui/bulk-operations/index.ts` - Export
- ✅ `app/styles/ui/_bulk-operations.scss` - Styles

### Feature 4: Commit Message Templates ✅ COMPLETE
- ✅ `app/src/models/commit-message-template.ts` - Template model
- ✅ `app/src/lib/stores/commit-template-store.ts` - Template store
- ✅ `app/src/ui/commit-template/commit-template-picker.tsx` - Template picker UI
- ✅ `app/src/ui/commit-template/index.ts` - Export
- ✅ `app/styles/ui/_commit-template.scss` - Styles

## Implementation Notes

### Account Model Changes (Completed)
- Added `accountId: string` (UUID) - unique identifier for each account
- Added `provider: GitProvider` - supports 'github', 'github-enterprise', 'gitcastle', 'gitlab', 'gitea', 'forgejo', 'other'
- Added `profileName?: string` - user-friendly name like "Work" or "Personal"
- Added `isActive: boolean` - tracks currently active account
- Added `displayName` getter - returns profileName or falls back to friendlyName
- Added `storageKey` getter - unique key for secure storage
- Updated `accountEquals()` to use `accountId` instead of endpoint+id
- Added helper functions: `isGitCastleAccount()`, `getProviderDisplayName()`

### Repository Groups (Completed)
- Groups have id, name, color, order, repositoryIds, isCollapsed
- Drag-and-drop reordering support
- localStorage persistence
- Context menu for rename/delete
- Ungrouped repositories section

### Repository Health Dashboard (Completed)
- Status cards showing uncommitted changes, unpushed commits, behind upstream
- Fetch All and Sync All buttons
- Progress tracking
- Sort by needs attention first

### Bulk Operations (Completed)
- Multi-select with checkboxes
- Bulk fetch/pull/push/discard
- Confirmation dialogs
- Progress tracking with progress bar

### Commit Message Templates (Completed)
- Built-in templates: Simple, Conventional Commits, Jira
- Variable support with validation patterns
- Template preview
- Custom template support (storage only)

## Summary

**Completed:**
1. ✅ Rebranding to TPT GitCastle Desktop
2. ✅ Multi-account support with provider system
3. ✅ Repository Groups feature
4. ✅ Repository Health Dashboard
5. ✅ Bulk Operations
6. ✅ Commit Message Templates

**In Progress:**
- Advanced Stash Management (Phase 5)

**Pending:**
- Better Submodule Support (Phase 6)
- Repository Templates (Phase 7)
- Branch Comparison Tool (Phase 8)

**Deferred:**
- Settings Backup (#9) - until storage requirements understood
- Scheduled Sync (#8) - until storage requirements understood
