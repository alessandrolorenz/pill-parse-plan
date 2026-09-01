You are a senior software architect specializing in React Native migrations and Software-Driven Development (SDD). I have an existing web application that I want to modernize by creating a React Native version of it, preserving all existing functionality without any behavioral changes. This could either be treated as a parallel distribution of the same app or as a new standalone app that continues to evolve independently.

Please provide a comprehensive technical guide addressing the following:

1. **Migration Strategy**: How should I approach this modernization using SDD principles? Should I treat this as a parallel distribution or a new evolutionary branch? What are the trade-offs of each approach?

2. **SDD Architecture for Migration**: How do I apply SDD methodology specifically to a web-to-React Native migration? How do I define and structure the software specifications to ensure the React Native app behaves identically to the web app?

3. **Harness Design**: How do I correctly create test and integration harnesses for this modernization effort? Cover the following in detail:
   - How to design harnesses that validate behavioral parity between the web app and the React Native app
   - How to structure harnesses to cover UI components, business logic, navigation flows, API integrations, and state management
   - How to use harnesses as living documentation during the migration
   - How to incrementally validate each migrated module using harnesses before moving to the next

4. **Incremental Migration Plan**: How do I break the migration into safe, testable increments using SDD? How do I prioritize which parts of the web app to migrate first?

5. **Shared Code Strategy**: What logic, services, and state management can be shared between the web app and the React Native app? How do I structure a monorepo or shared library to maximize code reuse while respecting platform-specific constraints?

6. **Regression and Parity Validation**: How do I ensure that nothing changes in terms of app behavior during and after the migration? What automated strategies and harness patterns guarantee functional parity?

Provide concrete examples, folder structures, harness code snippets, and SDD workflow steps wherever applicable.