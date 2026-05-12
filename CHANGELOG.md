# Changelog

## [3.0.1](https://github.com/abner-augusto/UFCIM-FRONT3D/compare/v3.0.0...v3.0.1) (2026-05-12)


### Bug Fixes

* **deps:** downgrade vite from 8.x to 7.3.3 due to compatibility issues ([ed0db98](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/ed0db98b932064a07d3da566f429bd55293d1028))

## [3.0.0](https://github.com/abner-augusto/UFCIM-FRONT3D/compare/v2.0.0...v3.0.0) (2026-05-12)


### ⚠ BREAKING CHANGES

* **config:** VITE_API_BASE_URL environment variable has been removed. API requests now route through configured proxy endpoints instead of direct environment-based URLs.

### Features

* add foundational mobile primitives (tokens, resets, PWA meta, and icons) ([68501a5](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/68501a5c7c8d6823927a1f99d6561e2a4752b0f6))
* implement notifications panel and enhance notification handling in UI ([2327660](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2327660715dad0b44bdec2c0e3321b4e4ac19291))
* implement responsive shell with top bar, bottom tab bar, and nav drawer ([4a01d71](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/4a01d719bfb38234af4e7cc1a15d801b60b53704))
* improve 3D viewer overlay UX on mobile ([733308a](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/733308aeb6d5c55f9a063bfc9576ad62bd4eb9e6))
* **notifications:** add preview limit and view all navigation to notification panel ([3bae7aa](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/3bae7aaa5c41df49c20ae243039843a1361bd0ba))
* polish auth and profile views for mobile with dvh and tap targets ([a6de0e5](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/a6de0e58eb90d457016c0418f920c8fca60a06ea))
* polish booking forms for mobile with sticky CTAs and responsive grids ([1d282e2](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1d282e27fa596a6e3a8ed1874ad4877f37934315))
* polish list views and selection screens for mobile responsiveness ([cb0851d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/cb0851df5775f0a318ab6f3bd00f5c7d0835323c))
* polish RoomPopup for mobile with fixed positioning and responsive layout ([8169795](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/8169795fe39730918d5520edfba463a0ad6daed3))
* **reports:** add occupancy report dashboard with charts and filters ([af42c36](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/af42c36995665c65f7f0f86473749e499884c79c))
* **reports:** update occupancy report structure and remove unused summary fields ([506767b](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/506767b395eb4c7e49fd5dd33d1053871f172869))
* **security:** add admin role and portal access with notification indicator ([89f0bea](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/89f0bea10334a7dcce039c3a3115864ed7c7b3a0))
* **three:** enhance camera behavior with height constraint and config updates ([d2af90e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/d2af90eabbe3d5b3ca54ef45ab78fa5f0a8e0444))
* **ui:** replace bottom floor panel with fixed controls rail for mobile viewer ([00dec7a](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/00dec7ab0226c2ec4e2784dec58360883c2b9180))


### Bug Fixes

* **3d:** remove duplicate 'Bloco' prefix in room popup ([42ef75b](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/42ef75b169e8bba8be71b7dd4e55cf95027e8df6))
* **three:** correct touch gesture mappings for intuitive camera controls ([6b02bf8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/6b02bf8fd710179650542d65797e9f08f6d6d36f))
* **ui:** add periodic unread badge poll for notification bell ([c2bc27d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/c2bc27d4880fcdf3898f593c4161ed5ec5532535))
* **ui:** add spacing between room name and block in search results ([2493555](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/24935556b16c904e92d2231da1ffadc47435985e))
* **ui:** close search sheet and open popup when selecting search result ([5a80cc5](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/5a80cc55aff6acedc60c0681a01336093cb48d8b))
* **ui:** refresh unread count on route change ([8e2d7aa](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/8e2d7aa96ec42ae94f6284c0dce4ea44193301d0))


### Performance Improvements

* **three:** apply low-risk 3D performance fixes ([952fae4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/952fae4ebe223f9fed35c2018012c5b8518d0544))
* **three:** lazy-load initial 3D floors ([1f42a52](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1f42a524a2f61bc450ccb3704c1c01211f6feae4))
* **three:** optimize 3D rendering performance with adaptive configuration and prioritized loading ([c58acc3](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/c58acc3fc6678f18723be640d364a151d4b53db5))


### Build System

* **config:** replace environment-based API configuration with proxy-based routing ([1d034ec](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1d034ecdaec753e91c2cfc639bc2233c0eb1c50a))

## [2.0.0](https://github.com/abner-augusto/UFCIM-FRONT3D/compare/v1.0.0...v2.0.0) (2026-04-28)


### ⚠ BREAKING CHANGES

* **ui:** Reservation status type now includes 'overridden' state; Space interface now includes optional equipment array; Blocking interface now includes optional space object with full details.

### Features

* Add dynamic camera zoom for block focus ([9b42f90](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9b42f90bf0dbbc06194726b047ff95ae5c1f9fa9))
* **auth:** add role permission constants and hasRole helper ([10b5944](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/10b59444ade76bb3fa9970252924d97a2f6c0a55))
* **auth:** implement token refresh, invitation system, and master admin support ([f36bce2](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/f36bce28ba1f705d07105686047e4cbac1737e53))
* **blocking:** add blocking creation view and my-blockings placeholder ([dd3822e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/dd3822eef7256dba85572d1e9d3a7b4e65235315))
* **campus:** add department selection step for Benfica campus ([07251e4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/07251e476e09a93597dd9647d0345346f91151b5))
* **infra:** use _worker.js for API proxying and remove non-functional _redirects ([2726c9c](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2726c9c549f1dca17967977cd615a9a365f6f003))
* **my-reservations:** add cancellation reason display for canceled reservations ([a0a1347](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/a0a134766c979ddcb06e7d7de210d6461f3d6633))
* **nav:** register blocking and profile routes; update AppHeader links ([fac51da](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/fac51da9f2bfe420965b3bd54a5af1a7c80b9d02))
* Phase 0 and 1 for app refactor ([f7c046a](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/f7c046ae673e7a522e4e6744c6210ebe7df02de5))
* Phase 3 — Vue app shell with routing, stores, and API layer ([8666306](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/86663068a073a49e1b9f1dec8126f70b4506de13))
* Phase 4 — campus selection screen + fix dev auth flow ([f2b0cfb](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/f2b0cfb88dbc5b5acd309f9b9c1eb72220bb8738))
* Phase 5 — Three.js viewer integration + space-driven pin system ([ff8a1a7](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/ff8a1a7b905af26cd070651b3526ad1e98d5e8da))
* Phase 6 — reservation flow, my reservations, and notifications ([060a711](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/060a711ff70a61e422f1462394411200d5d1a8b8))
* **pin-status:** update pin status logic to include 'closed' state and adjust reservation conditions ([4790293](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/4790293c5dae80ee27c06d12ed7737b3dd359766))
* **profile:** add user profile view with role display and logout ([b47fd45](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b47fd45328b7f5cd5924d3424a9fc33f9107e20d))
* Rename resetCamera to resetView ([50fcba5](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/50fcba5c907fa7670109ae50054b22488cff58f9))
* **reservation:** add recurring flow, role guard, and fix availability check ([3de36bc](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/3de36bc33d1d8097ec023802b19f529d40541c5a))
* **reservation:** enhance reservation functionality with custom scheduling and availability checks ([10028a2](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/10028a2d1e09b3ebab1670e6c04b87b9754a6475))
* **reservations:** implement series cancellation and group reservations by recurrence ([9b49952](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9b4995244c47fe79a46a9a1ac4889e1df5b97420))
* **space-browser:** implement space browsing functionality with filters and search ([74fe486](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/74fe48694eafa8822e8805bc581e49ca3dbbdc2d))
* **space:** add Equipment type, equipment list in popup, and role-gated actions ([0c9d44d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/0c9d44db01f45e389f634013268398c50f7bb5b2))
* **space:** enhance Space interface with additional properties and update RoomPopup and ReservationView components for improved space information display ([3b2e646](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/3b2e646da451e61b8a1fb74a7f7173c8e6d09d89))
* **ui:** add date picker for space availability filtering ([54e997e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/54e997e48a77996ae5f2b09a1d487eaf6a5da7c8))
* **ui:** add notification badge, equipment display, blocking management, and reservation enhancements ([15d0fc4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/15d0fc421eff92ba60482675b7b41da4b0d793cd))
* **ui:** add viewer route to AppHeader and update campus store for session management ([0a46008](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/0a460080592ea859bf5a03cbf64a2c235cac9f64))
* **ui:** display completed status for past confirmed reservations ([5bba6c8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/5bba6c8ca4d5658fc5e4366802cbb510e00ab100))
* **ui:** enhance MyReservationsView with expandable reservation details and improved styling ([0d72aed](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/0d72aed48726273f7849f95779e592e8947467bf))
* **ui:** enhance RoomPopup and ThreeViewer components with equipment grouping and floor UI visibility toggle ([6bdcf9d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/6bdcf9db3db0580b4bb1c36466bafbbb59069049))
* **ui:** update reservation logic to use 'reservable' property and handle non-reservable spaces ([6e9860a](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/6e9860aeab8244019bace4e303b9e2c87cdab29b))
* **viewer:** add pin availability and reservation status feedback ([d03369c](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/d03369c3d1636fe557b14487b03c50736c588849))
* **viewer:** update pin opacity for blocked and non-reservable rooms ([3877aea](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/3877aeabb4c28b1bdd75309a8bf58245b5428026))


### Bug Fixes

* **api:** align frontend client with documented contracts ([63affcc](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/63affcce80049064a865819998751428a7089708))
* **api:** bypass CORS using relative paths and Cloudflare Pages proxying ([634c852](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/634c85205c8c83600ce10d5cd11e2e4390427b35))
* **auth:** restore user from token on page refresh ([610141c](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/610141c0f9eec2a70bc39391f2cccd6c3797f5c5))
* backend-driven pin visibility, dedup pin events, and UI cleanup ([63658d6](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/63658d6c10640fa9c9d25cab9122a2ec0eceb01c))
* **blocking:** ensure reason is always trimmed before submission ([70c29ed](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/70c29edd19254ee593259f8b4004ff4aaae3249e))
* **blocking:** update full day blocking end time from 23:00 to 24:00 ([877a396](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/877a396492111fb0cf28cc180e6300e568fe5a79))
* **build:** correct build:manifest script to use supported CLI options ([bcdd9a6](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/bcdd9a6abbe55342587a58b107040689acc67138))
* handle potential null data in reservations and notifications loading ([2c15022](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2c15022332856b5e910845948143982ef47ed96b))
* **reservation:** replace timeSlot with startTime/endTime to match backend schema ([50632e0](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/50632e099cc2af79262cb114974791673dff1c99))
* **ui:** display space number instead of name in room popup and card ([b9b3e28](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b9b3e283a7970f4f5825f9b4986d71b8efabcb93))
* **ui:** show exact times on reservations and fix invalid date on notifications ([b9cdea4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b9cdea4a17171e80fa727b4ce16a210a79ec549c))
* **ui:** update blocked pin color to grey for better visibility ([d531a2a](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/d531a2a32977fb8cbf1eb333e964bbcdc28d37a2))


### Performance Improvements

* Increase camera near clipping plane to 1 ([4e4a43b](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/4e4a43b93bc9e24f69b3c9a57871c2bdf219343c))

## 1.0.0 (2025-11-28)


### Features

* Add favicon to site ([b69cb3c](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b69cb3c96b1adf266faf43d333191cd7735a5da6))
* add loading screen to app initialization ([3b7070b](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/3b7070b501f4da1e0a0979be60d7a7c2d8aaad26))
* Add manifest.json generation script and update package dependencies ([9bd5e45](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9bd5e45581e2ed8d7f28d9b62c8fdf9567e67dc9))
* Add new GLB model files for IAUD project across multiple blocks and floors ([b4ff5c1](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b4ff5c154a5eeebae07f0837f0b8e423a5f801ae))
* Add pins for various rooms in IAUD manifest ([2d6ddf1](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2d6ddf1a3cb3f3cabf6160352dae987ea07ea7ad))
* Add project README ([e9870e6](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/e9870e61ad4e20ac8369563cf077d8f64eafe053))
* Add repomix-output.txt to .gitignore ([74067b7](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/74067b79bab060024cd74b1d521b7909e7d2c83e))
* Add Roboto font and unify font usage across UI ([b92cf75](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b92cf7579b44e7257864d25ea0455a4fd949474e))
* Add search bar functionality ([1cb3193](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1cb319336366c22fd46dddf5544b1d74e51cab3e))
* Add stats.js for performance monitoring and enhance rendering options in App component ([bcee4b1](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/bcee4b1ee65c1db8deb95a9e31862fa3d75b20f0))
* Add support for silent pins ([9c11aff](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9c11aff44baf1f0384f707096f2d9573eeb00a7f))
* Add table of pins by block and floor to README ([604a2cb](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/604a2cbe2f96a659f4b54a8284f6d9518b1f6c77))
* Add XLSX to JSON pipeline for popup data ([cca0ca1](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/cca0ca1d42d4b648956ccf892ab8022b33b27a69))
* Adjust pin sprite positioning and scaling for improved visibility ([a5cc1c0](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/a5cc1c05b6c47691c4e7f3f4b1072538cd08b958))
* API for focusing on pins and buildings ([71ef734](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/71ef734a1d40c674bbc72f58838b47299613e3d5))
* Disable interactions when showing popup ([1195f19](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1195f1990aa7e1e5d7d2c3c75f81aa697260a4b2))
* Document public viewer API in README ([2627e7e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2627e7e321e46e4d99463563f08825b910be31dd))
* Enhance camera debug UI and improve camera positioning logic ([6e93689](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/6e93689e508afb4ef2fcebbaa3ba88aca1a7f4a2))
* Enhance camera focus behavior and pin management in UI ([84fa953](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/84fa9537ece5e414542272ebcdaebfb13fe9c108))
* Enhance interaction management with blocking meshes and debug menu ([9b5d9e8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9b5d9e843dba6add33d73dcb687989121266fe6e))
* Enhance pin management and visibility handling in interaction and model managers ([e6743d4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/e6743d4d1b38f52f0a1e876bbd053477870e1da0))
* Enhance popup functionality and interaction management with floor level filtering ([cb977ba](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/cb977ba30ce66289ca68ea5e1987a5745f2f4c17))
* Enhance PopupManager to manage selected pin to show on top of the model ([738a71e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/738a71e59290adf990e1c6b1e7415899ea2af1f3))
* Implement CameraManager and PopupManager enhancements for improved UI interactions and camera controls ([019c4b1](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/019c4b1c51edaca695573828a0f226e72b1fe228))
* Implement core application structure with Three.js ([1bfafa7](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/1bfafa7c865076b2225c893a88a226815bda4e93))
* Implement custom outline pass and surface ID generation for enhanced visual effects ([f4a1c99](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/f4a1c996e4abc132dafdbec85dabe22bf9fa712d))
* Implement PinFactory for managing pin creation and labeling, enhance interaction with blocking meshes ([9679d9e](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/9679d9ec05f460106e11472da1f041c44cc9622c))
* Improve pin label rendering ([6f8b000](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/6f8b0003e86dab3bb0db07ec2416a9ab48528535))
* Integrate CameraManager into App for enhanced camera controls and update model loading process ([db1848d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/db1848d5a5c0c684fde21ea47030653d19ff72c5))
* pin now respect openspopup flag ([0e254a9](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/0e254a979dae5b8c34f1d8ee8a5f6114ebedb9d1))
* Refactor API logic into UFCIMAPI class ([b24f84d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b24f84ddc2855ab3bf27324747668a7f90082fb9))
* Refactor App initialization into helper methods ([5e67f07](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/5e67f076ffe069f89469b1b601e8243b758912c6))
* Refactor App.js method order and grouping ([b2ae994](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b2ae99419213d58aea2b2c2e137a4bf6cc983c7f))
* Refactor application structure and introduce PopupManager ([c74a96d](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/c74a96dd41da8929c56059b3e8ac12ee8f7d31b1))
* Refactor debug menu to use lil-gui ([b2495d4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b2495d4dafd0767252ddf39e4a0e46d7819872e3))
* Refactor ModelManager for DRACO support and cleanup ([be1b885](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/be1b885cd98afed84607b7696c7c256f8cf78998))
* Refactor ModelManager to enhance manifest handling and floor management ([da66f68](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/da66f68ecdee0bdaf34a3f3dff85d09e85c13c53))
* Remove FindSurfaces and inline getSurfaceIdMaterial ([2b27aba](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/2b27aba49c3b08f4a4ac6070c6f555432e07f40f))
* removed old debug UI code ([b1a9ff8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/b1a9ff8923702b45ef06068567d73494926b7a84))
* Standardize room IDs and update manifest generation ([e243515](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/e243515096b74f0f6b6cff383beee91e5f272098))
* support hidden models ([af7e18f](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/af7e18fd03a150528345933a3505e237c2ce2172))
* UI controls and stats management in App ([c106104](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/c1061047127af31a0c7d6fa3ba6e951993c4478e))
* Update build script to include manifest generation before building ([5bfd1d8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/5bfd1d8554b0fda10a844935c2042e45224a8119))
* update IAUD 3D models and manifest pins ([44e72d8](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/44e72d880844cf34ac49156c785912e3900ed054))
* update IAUD models to use draco compression ([636bf55](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/636bf55eb684ce4a86a625e8451fddac57314a00))
* update model loading logic ([69e6eaa](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/69e6eaa119541c2bde926ebb89d1b04584c21db3))
* Update pins table section in README ([574d994](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/574d99409f411873c04bd9f64308a4a84e8bfd41))


### Bug Fixes

* Filter invisible objects from raycast targets ([d8e8438](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/d8e843822f0bad0f5de188935f7fcc201939b676))
* pretty-print json by default on pins db ([667b43c](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/667b43c5082294c0c7784d9ca46ed2d2327f6bd6))
* Temporarily disable outline shader in CustomOutlinePass ([4b290c4](https://github.com/abner-augusto/UFCIM-FRONT3D/commit/4b290c4e212a940a9789b640529e445c9d295b22))
