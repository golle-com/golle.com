import { type NavView } from './features/navigation/SideNavbar'

export type PlannedView = {
  id: string
  label: string
  path: string
  apiNamespace: string
  description: string
}

export const plannedViews: PlannedView[] = [
  {
    id: 'downloads',
    label: 'Downloads',
    path: '/downloads',
    apiNamespace: '/downloads',
    description: 'List, open, and delete completed downloads.',
  },
  {
    id: 'torrents',
    label: 'Torrents',
    path: '/torrents',
    apiNamespace: '/torrents',
    description: 'Manage torrent list, info, and file selection.',
  },
  {
    id: 'unrestrict',
    label: 'Unrestrict',
    path: '/unrestrict',
    apiNamespace: '/unrestrict',
    description: 'Check and unrestrict links and containers.',
  },
  {
    id: 'streaming',
    label: 'Streaming',
    path: '/streaming',
    apiNamespace: '/streaming',
    description: 'Transcoding links and media info lookup.',
  },
  {
    id: 'hosts',
    label: 'Hosts',
    path: '/hosts',
    apiNamespace: '/hosts',
    description: 'Hoster support, availability status, and regex metadata.',
  },
  {
    id: 'account',
    label: 'Account',
    path: '/account',
    apiNamespace: '/user',
    description: 'User profile and account details.',
  },
]

export const navViews: NavView[] = plannedViews
  .filter((view) => view.id !== 'streaming')
  .map(({ id, label, path }) => ({ id, label, path }))