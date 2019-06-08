const socket = io() // provided by the socket io script in index.html
//allows us to send and receive events to and from the server

/*socket.on('countUpdated', (count) => { //looks for the countUpdated event that we created on the server side
    console.log('The count has been updated', count); //count was provided by the second arg in socket.emit in index.js. the second arg in the server side is the first arg of the callback in the client side
});

document.querySelector('#increment').addEventListener('click', () => {
    console.log('Clicked');
    socket.emit('increment')//everytime the increment button is clicked emit an event called increment to the server
}); */

//Elements 
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $messageFormLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

//templates
const messageTemplate = document.querySelector('#message-template').innerHTML; //gives us access to the html inside the script tag
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//options
const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true}) //parses query string on location.search which is how we access query string in js. The ignore part makes sure the ? in the querystring is ignored in our object returned fro Qs

const autoscroll = () => {
    //New message element
    const $newMessage = $messages.lastElementChild; //grabbing the last element of messages at the bottom which would be the last message

    //Height of the new message
    const newMessageStyles = getComputedStyle($newMessage); //gets the properties of the new message css
    const newMessageMargin = parseInt(newMessageStyles.marginBottom); //turns string into int. Gets the css property of margin bottom and finds the number of px of the margin bottom 
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin; //find total height of message plus margin 

    //Visible Height
    const visibleHeight = $messages.offsetHeight
    
    //Height of messages container 
    const containerHeight = $messages.scrollHeight;

    //How far has the user scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight //ScrollTop is Distance we have scrolled from the top

    if (containerHeight - newMessageHeight <= scrollOffset) { //checking if total height minus the newest message height is less than the total height scrolled (we have reached the bottom of the scroll)
        $messages.scrollTop = $messages.scrollHeight; //the distance from the top of the scroll should be equal to the total scroll height after the new message has been submitted
    }
    

}

socket.on('locationMessage', (message) => {
    console.log(message);
    const html = Mustache.render(locationTemplate, { //rendering the html of location template in the script tag
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html); //adding the messages div before the end of the inner html of the location template
    autoscroll();
});

socket.on('message', (message) => { //passing message object from server
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text, //passing message to index.html using mustache. 
        createdAt: moment(message.createdAt).format('h:mm a') //using moment lib to format time as follows hour:minute am/pm
    }); //using mustache to render template from index.html
    $messages.insertAdjacentHTML('beforeend', html); //inserting our new message div right before the bottom of the mustache template we created
    autoscroll();
});

socket.on('roomData', ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    document.querySelector('#sidebar').innerHTML = html;
});

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute('disabled', 'disabled'); //sets the form button property of disabled to disabled. This is so you can't send more info while something is sending

    const message = e.target.elements.message.value;
    //e has property to check what we are listening on, in this case the form. then it checks for an element with the name message and we store that value on the message var

    socket.emit('sendMessage', message, (error) => { //callback is an acknoledgement of the message
        $messageFormButton.removeAttribute('disabled', 'disabled'); //after message is sent enable button again
        $messageFormInput.value = ''; //clears string after message is sent
        $messageFormInput.focus(); //highlights the form after message is sent
        if(error) { //error from bad-words npm module
            return console.log(error);
        }
        console.log('The message was delivered!', message);
    });
});

document.querySelector('#send-location').addEventListener('click', () => {
    if(!navigator.geolocation) { //if this property exists on your browser, then you have geolocation supported
        return alert('Geolocation not supported on this browser');
    }

    $messageFormLocationButton.setAttribute('disabled', 'disabled');

    navigator.geolocation.getCurrentPosition((position) => { //logging current position
        //console.log(position);
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => { //acknowledgement of location data

            $messageFormLocationButton.removeAttribute('disabled', 'disabled');
            console.log('The location has been shared');
        });
    });
});

socket.emit('join', {username, room}, (error) => {
    if(error) {
        alert(error);
        location.href='/' //redirects back to home page if there is an error
    }
}) //sending Qs data on join 