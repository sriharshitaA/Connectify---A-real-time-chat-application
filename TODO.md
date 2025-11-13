# TODO: Add Search Functionality to ChatRoom

## ChatRoom.js Updates

- [x] Add state variables: showSearch, searchQuery, filteredMessages
- [x] Add search button (🔍 icon) in header next to refresh button
- [x] Implement toggle for showSearch to show/hide search input
- [x] Add inline search input field when showSearch is true
- [x] Implement filtering logic for messages based on searchQuery
- [x] Display filteredMessages instead of messages when searching
- [x] Add clear search button (❌) when search is active

## MessageCard.js Updates

- [x] Add searchQuery as prop to MessageCard component
- [x] Modify text message rendering to highlight search terms with <mark> tags

## Testing

- [x] Test message filtering by entering search queries
- [x] Verify search term highlighting in MessageCard
- [x] Ensure search works within specific chatroom context
