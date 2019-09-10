export class App {

    private static instance?: App;

    private constructor() {
        // ensure that there is only one instance
        if(App.instance) {
            throw new Error('App is a singleton object, use getInstance method to retrieve object reference');
        }
        // init
    }

    public static getInstance() {
        if(!App.instance) {
            App.instance = new App();
        }
        return App.instance;
    }

    public static run() {
        const instance = App.getInstance();
        console.log('running');
    }
}
