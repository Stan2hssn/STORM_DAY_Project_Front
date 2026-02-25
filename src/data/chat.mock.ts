import type { Account, Conversation, DirectoryUser, Message } from '@/types/chat'

export const accountsSeed: Account[] = [
  { id: 'acc-business', name: 'WhatsApp', role: 'Business account', avatar: 'WA' },
  { id: 'acc-stan', name: 'Stan Husson', role: 'Personal account', avatar: 'SH' },
  { id: 'acc-team', name: 'Storm Team', role: 'Workspace account', avatar: 'ST' }
]

export const directoryUsersSeed: DirectoryUser[] = [
  { id: 'usr-darth', name: 'Darth', handle: 'darth@storm', avatar: 'DA', status: 'online' },
  { id: 'usr-flo', name: 'Flo-Jo', handle: 'flojo@storm', avatar: 'FL', status: 'online' },
  { id: 'usr-grim', name: 'TheGrimReaper', handle: 'grim@storm', avatar: 'GR', status: 'offline' },
  { id: 'usr-chief', name: 'TheChief', handle: 'chief@storm', avatar: 'TC', status: 'online' },
  { id: 'usr-butter', name: 'Butterbean', handle: 'butter@storm', avatar: 'BT', status: 'online' },
  { id: 'usr-shogun', name: 'Shogun', handle: 'shogun@storm', avatar: 'SG', status: 'offline' },
  { id: 'usr-mega', name: 'Megatron', handle: 'mega@storm', avatar: 'MG', status: 'online' },
  { id: 'usr-hawk', name: 'TheHawk', handle: 'hawk@storm', avatar: 'HK', status: 'online' },
  { id: 'usr-matty', name: 'MattyIce', handle: 'matty@storm', avatar: 'MI', status: 'online' },
  { id: 'usr-guac', name: 'Guacamolli', handle: 'guac@storm', avatar: 'GU', status: 'online' }
]

export const conversationsSeed: Conversation[] = [
  {
    id: 'conv-passage-lovers',
    name: 'Passage Lovers',
    preview: 'Guacamolli: Great spirits have always...',
    time: 'Fri',
    unread: 0,
    active: true,
    isGroup: true,
    participantIds: ['usr-guac', 'usr-flo', 'usr-darth', 'usr-grim', 'usr-hawk']
  },
  {
    id: 'conv-flo',
    name: 'Flo-Jo',
    preview: 'Eighty percent of success is showing...',
    time: '12:04',
    unread: 3,
    isGroup: false,
    participantIds: ['usr-flo']
  },
  {
    id: 'conv-matty',
    name: 'MattyIce',
    preview: 'You: Hey!',
    time: '15:10',
    isGroup: false,
    participantIds: ['usr-matty']
  },
  {
    id: 'conv-chief',
    name: 'TheChief',
    preview: "Anyways, that's my two cents plan...",
    time: 'Mon',
    isGroup: false,
    participantIds: ['usr-chief']
  }
]

export const messagesByConversationSeed: Record<string, Message[]> = {
  'conv-passage-lovers': [
    { id: 'm-1', author: 'Darth', text: 'Hey guys!', time: '22:03', side: 'left' },
    { id: 'm-2', author: 'Flo-Jo', text: 'How are you?', time: '22:03', side: 'left' },
    { id: 'm-3', author: 'Megatron', text: 'awww', time: '22:03', side: 'left' },
    {
      id: 'm-4',
      author: 'TheGrimReaper',
      text: 'In the end, it is never what you worry about that gets you. It is what you do next that changes everything.',
      time: '22:03',
      side: 'left'
    },
    { id: 'm-5', author: 'You', text: 'In the end, it is never what you worry', time: '22:03', side: 'right' },
    { id: 'm-6', author: 'You', text: 'woohoooo', time: '22:03', side: 'right' }
  ],
  'conv-flo': [
    { id: 'm-flo-1', author: 'Flo-Jo', text: 'Need a quick sync before launch?', time: '11:10', side: 'left' },
    { id: 'm-flo-2', author: 'You', text: 'Yes, lets do it at 2pm.', time: '11:12', side: 'right' }
  ],
  'conv-matty': [
    { id: 'm-matty-1', author: 'MattyIce', text: 'You free this afternoon?', time: '14:05', side: 'left' }
  ],
  'conv-chief': [
    { id: 'm-chief-1', author: 'TheChief', text: 'Anyways, thats my two cents plan.', time: '09:23', side: 'left' }
  ]
}
