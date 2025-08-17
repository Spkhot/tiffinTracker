// public/sw.js

self.addEventListener('push', e => {
    const data = e.data.json();
    const options = {
        body: data.body,
        icon: 'assets/image.png',
        actions: data.actions,
        data: data.data
    };
    self.registration.showNotification(data.title, options);
});

// In your public/sw.js file

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    const data = event.notification.data;
    const action = event.action; // 'yes' or 'no'

    if (!action) {
        // This is when the user clicks the notification body, not a button
        console.log('Notification body clicked.');
        return;
    }

    if (action === 'yes') {
        // If 'Yes', just send the response to the backend to update.
        // The user doesn't need to be redirected.
        const responsePromise = fetch('/api/notifications/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: data.token,
                status: 'taken',
                reason: ''
            })
        });
        event.waitUntil(responsePromise);
    } else if (action === 'no') {
        // If 'No', open the dashboard and tell it to ask for a reason.
        // We pass the unique notification token in the URL.
        const urlToOpen = new URL('/dashboard.html', self.location.origin);
        urlToOpen.searchParams.append('action', 'prompt_reason');
        urlToOpen.searchParams.append('token', data.token);

        const openWindowPromise = clients.openWindow(urlToOpen.href);
        event.waitUntil(openWindowPromise);
    }
});