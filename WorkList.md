
# Calendly
Create skill `.github/skills/ailey-com-calendly` for Calendly
Reference: https://developer.calendly.com/getting-started
be sure to include account level detection and instructions on how to get the access if they need.  If the access information is missing also add instructions on how to configure the access setting in ai-ley.  

# TimeTap
Create skill `.github/skills/ailey-atl-timetap` for Atlassian's TimeTap
Reference: https://timetap.atlassian.net/wiki/spaces/TTAPI/overview
be sure to include account level detection and instructions on how to get the access if they need.  If the access information is missing also add instructions on how to configure the access setting in ai-ley.  

# Twilio
Create skill `.github/skills/ailey-atl-twilio` for twilio
be sure to include account level detection and instructions on how to get the access if they need.  If the access information is missing also add instructions on how to configure the access setting in ai-ley.  

# UI Changes
All changes in this section apply to the AI Comand Center VSCode Extension for the AI Command Center Secondary Panel 

## Model-View-Controller


## 

## AI Kit Loader 

- Rename to AI Kits
- Change the existing interface to be more like an iphone store
- Icons should have rounded corners at 10px
- Icons should have a 3px border around them, default color: white
- Available market items are in `.github/aicc/catalog/{{KitName}}/structure.json`
- Images are stored in the same folder as the catalog item, Filename is included in the structure.json for the catalog entry
- Images should be passed as base64 inline images 
- When clicking on the Icon a modal will come up: 
  - Two Tabs "Kit Info", "Kit Configuration"  
  - configrations based on the schema `.github/aicc/schemas/structure.v1.schema.json`
  - Kit Configuration should populate based on Model-View-Controller using the `.github/aicc/catalog/{{KitName}}/config.json`
- When installed, the configuration is copied and stored with the updates under `.my/aicc/catalog/{{KitName}}`
- Installed kits (kits that are listed in  `.my/aicc/catalog/{{KitName}}`) have a green border.
- Ability to add catalog items.  This should be represented as a button with a plus in it.  These are stored directly in `.my/aicc/catalog/{{KitName}}` and are represented with a blue border on the icon.
- Bundles within a kit are managed using `.github/aicc/catalog/{{KitName}}/bundles.json` that references individual files and folders for agents, instructions, skills, prompts and personas.  
  - This should use a schema at `.github/aicc/schemas/bundles.v1.schema.json`.  This will need to be created.
  - must be able to add and remove components selected in the bundle file.
  - Default installed flag are set in the bundle.json file
- Modals will also provide controls to install (if it is installed then it shows as remove to cleanly remove), update,  evolve and contribute.  


UI Changes 

- Open a modal on click to set things up
  - Settings tab that exposes configuration values for the Kits
  - Individual component/bundles selection in a tree view (add/remove)
    - This should be structured in a path structured in the frontmatter that goes into the schema 
- Align schemas to the work version
- status case should be upper case

- Reload WebViews should be a refresh button, but is a burger stack button
- Fix/rename the intake panel 
- Create a tab for the configuration of the skills - each skill should havea config pack
  - should allow it to set/delete the variables at the workspace or global
- Add Scheduler 

- Remove the Tree View
- Remove the Web View Tab

- Planning Tab
  - Comments should have a toggle to enable or disable from being sent to AI
  - Add checkboxes to each of the rows to run multiple
    - The Run Next button is updated to Run (# of tassk)
    - Clicking Run should call the prompt /run
  - Add a tab to assing the Agent, Instructions (Add/Remove List), Personas (Add/Remove List)
  - Add Jira Configuration Panel ( Losely couple this to the enabled planning agent and their configuration rather than just Jira)
  - Should have an ai planning wizard button next to the send 
  - Need a revise full plan as well
  - Add SKIP status 
  - Add Filter button for SKIP 
  - Create a quick status panel for the project 
  - Remove the first summary tab in the project div 

- If all setting changes are in real time, then really don't need a saveall button 

- Settings button should call Aicc settings 

- Integrate Help Documentation 
  - Should give base instructions, and then tabs to shift to other installed kits 

- Add a Advanced mode toggle button
  - Move API Docs panel under this 
  - Add codicons panel in it 
  - Add a component catalog in it 
  - Shows the Tags icon and the debug icon in the header 
  - shows the scheduler tab

- Add a Scheduler Tab
  - This has a list of tasks that are scheduled 
  - Scheduler should mave a similiar skill to manage it 


MCP Server
- Move MCPs to command prompts for skills 
  - This should be an optional flag 
  

Instruction Changes 
- Cleanup and optimizations
- Create a complex designer structure

Prompt Changes 
- add Instructions finish, currently non-functional
- Build design shoud use new designer structure 
- Consolidate to Run and remove run-next
  - This adds in 1, list or next to the detected options




Skill Changes
- Create the progress report - it is missing
- Add Kafka Skill


Swagger interface changes
MCP Testing tool 