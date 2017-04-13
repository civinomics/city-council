Civinomics City Council
--


Application Architecture 
---


```
|--web                                              
    |--dist                                           * public directory (ng build output) - NOT TRACKED 
    |
    |--lib                 
    |
    |--modules                                        * output 
        |--core 
        |    |--package.json                          * @civ/cc-core - see (1) 
                 |--core.module                       * 
        |--browser 
        |    |--package.json                          * @civ/cc-browser - see (2) 
            
   |--src
   |--tsconfig.json                                   * FOR IDE ONLY       
        
       
|--cloud 
     |--functions 
     |    |--package.json                           * @civ/cc-cloud-functions (3)
     
     |--meeting-reports                             * see () 
     |    |--package.json                           * @civ/cc-reports (4)




|--package.json                                     * @civ/cc-srcs (this) 
|--tsconfig.json                                    * FOR IDE ONLY
    

```
Notes: 

This package is distributed through 5 

(1) @civ/cc-core
    
    - Declares components 
    
    - Entry module: 
        - DOES NOT bootstrap anything 
        - exports a set of routes along with 2 routing modules*, but the entry module DOES 
            * declaring the same set of routes in .forRoot and .forChild implementations
        - imports @angular/common, not @angular/browser
    
(2) cc-browser imports cc-core. No additional source code except 

    - Entry module: 
        - bootstraps CivRootComponent from cc-core 
        - imports root router module from cc-core 
        - imports @angular/browser
        

Note that core and browser share a same codebase, they're just published with different entry modules and different dependencies. 


(3) cc-reports is a 
ng app that runs server-side, pre-renders HTML page for meeting reports that are then rendered to PDF by [generate-report]() function.
  
 
(4) cc-cloud-functions  
 
 
We use [Browserstack](https://www.browserstack.com) to make sure we look sharp on Chrome, Firefox, Safari(7+) and IE(10+) - you should too!
