# App Flow Document

## Onboarding and Sign-In/Sign-Up

When a new user first lands on the application, they arrive on a clean landing page that briefly describes the distributor tool and offers two clear options: create an account or sign in if they already have credentials. Creating an account begins with entering an email address, a strong password, and confirming the password. After submitting this form, the user receives a confirmation email with a link. Clicking the link returns them to the app where their account is now active.  

For signing in, the user enters their registered email and password on the login page and clicks the sign-in button. If credentials match, they are directed to the main dashboard. Forgotten password is handled through a “Forgot Password” link below the sign-in form. The user provides their email and receives a secure reset link. Following that link opens a page to set a new password, and after successful reset, they can log in normally.  

To sign out, the user clicks the profile icon in the top header and selects “Sign Out.” This returns them to the landing page and clears any session tokens. The entire sign-in and sign-up flow is built on JSON Web Tokens, so session tokens and refresh tokens are stored securely in an HTTP-only cookie. If the refresh token expires, the user is redirected to the login page.

## Main Dashboard or Home Page

After signing in, the user lands on the dashboard. At the top is a header bar showing the application logo on the left and the user’s profile icon on the right. Below the header is a main content area that displays key widgets such as total sales this month, products low in stock, and any pending notifications. Along the left side of the screen is a vertical navigation menu with links to Products, Price Schemes, Sales Orders, Point of Sale, Import / Export, Reports, and Settings. Each menu item has a clear icon and label.  

Selecting any menu item loads the corresponding screen into the main content area without a full page reload. The side menu remains visible to allow quick movement between sections. When the user hovers over a side menu link, a brief tooltip appears to explain the feature. The dashboard itself gives the user a quick snapshot of their business performance and alerts, and it acts as the entry point to detailed tasks.

## Detailed Feature Flows and Page Transitions

When the user clicks on Products in the sidebar, they see a table listing all products with columns for SKU, name, current stock, and actions. At the top of this page is a button labeled “Add Product.” Clicking this opens a full-screen form overlay where the user can enter product details like name, SKU, cost, and safety stock threshold. Submitting the form adds the product to the database and returns the user to the product list view, now showing the new item. Editing a product is done by clicking the edit icon in its row, which opens the same form pre-filled with existing data. Deleting a product prompts a confirmation modal; confirming removal updates the table immediately.

Under Price Schemes, the user lands on a list of existing schemes with details of discount rules or cost margins. A button labeled “Create New Scheme” opens a modal where the user enters a scheme name, selects products or categories it applies to, and defines pricing rules using simple fields. Saving the scheme closes the modal and updates the list. Clicking a scheme’s name opens a dedicated page showing its detailed rules, and there the user can toggle it on or off or click an edit button to modify the rules in place. Returning to the list uses the same side navigation.

The Point of Sale page works as an interactive checkout screen. At the top, the user sees a search bar to look up products by name or SKU. Below that is the cart section. When the user clicks on a product result, the item appears in the cart on the right. The cart allows the user to adjust quantities, apply a discount code or freehand discount, and see line-item totals. A “Complete Sale” button at the bottom triggers a modal to confirm payment method—cash or card. Confirming sends the sale to the backend, which runs in an atomic transaction updating stock and recording the sale. On success, the modal closes, the cart clears, and a small toast notification confirms the sale. The cart state is stored locally first so the user can continue working if the connection stalls, and it synchronizes with the server when connectivity returns.

In Sales Orders, the user sees a log of all completed transactions. Each row shows the order number, date, total amount, and status. Clicking on an order number opens a detail view page where the user can see line items, applied schemes, and customer information. From this page they can print a receipt or export the order to CSV. Using the back link in the header returns them to the full list.

The Import / Export section lets the user upload a CSV file to bulk create or update products and orders. Choosing “Import Products” opens a page with a drag-and-drop area. After dropping a file, the user sees a preview of parsed rows and can confirm to start processing. A progress bar appears until the server finishes reading the CSV stream and creating records. Exporting works similarly by clicking “Export Products” or “Export Orders,” then the system generates a downloadable file link within the page.

Real-time updates flow through a WebSocket connection. If stock falls below the safety threshold, the user receives a banner alert at the top of the screen. Clicking the banner takes them to the Products page filtered to only low-stock items.

## Settings and Account Management

When the user selects Settings from the side menu, they arrive on their personal account page. Here they can update their display name, email, and phone number in a simple form. Below that is a section for changing password, which asks for current password, new password, and confirmation. Saving either form yields a success message and updates the session.  

Further down in Settings is a section for notification preferences. Toggles allow the user to enable or disable email alerts for low stock or daily sales reports. Clicking “Save Preferences” writes these choices to the backend and confirms each setting with a toast. For users with billing or subscription plans, a separate tab labeled “Billing” appears. In Billing, the user can view current plan details, payment method, and invoice history. A button labeled “Update Payment Method” lets them enter new card details, which are sent to the payment provider and then reflected in the billing tab once confirmed.  

At any point after saving changes in Settings, the user clicks the logo in the header or the Dashboard link in the side menu to return to the main homepage.

## Error States and Alternate Paths

If a user enters incorrect login credentials, the login page displays an inline error message under the password field reading “Invalid email or password.” The password reset form shows a generic success message even if the email is not recognized, to avoid revealing account existence.  

In any form page, if required fields are empty or invalid, the user sees inline validation messages next to each field. Trying to save triggers automatic focus on the first invalid field so the user can correct it. If the network drops while the user is working, a banner appears at the top warning “You are offline. Changes will sync when connection returns.” The user can continue working on client-side forms or the POS cart, and any submissions queue up until connectivity is restored.  

When the user attempts to access a route they lack permission for, such as an owner-only admin panel, they see a “403 Forbidden” page with a simple message and a button to return to the dashboard. Unexpected server errors return a friendly “Something went wrong” message and a button to reload the page. For file uploads over the size limit or with invalid formats, the import page shows a clear error block explaining the problem and suggests supported file types.

## Conclusion and Overall App Journey

From landing on the app’s public page to completing a sale or updating pricing rules, the Distributor Application guides users through a clear, consistent, and responsive workflow. Users sign up or sign in securely, explore a dashboard that provides immediate insights, and navigate effortlessly between product management, price scheme creation, point of sale, and data import or export. Settings allow personalization of account details, notifications, and billing, while robust error handling and offline support ensure users can work without interruption. By following this flow, any user can register, manage inventory and pricing, complete sales, and generate reports in one seamless experience.