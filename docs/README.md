<!DOCTYPE html>
<html lang="en">
<body>

  <div align="center">
    <img src="docs/Media/paradox-header.png" alt="Paradox AntiCheat Logo">
  </div>

  <h1>Contributing to the Paradox AntiCheat Documentation</h1>

  <p>Welcome to the Paradox AntiCheat documentation repository! This guide will help you contribute to the website, make changes, and test them locally before submitting a pull request.</p>

  <h2>Prerequisites</h2>
  <p>Before contributing to the documentation, make sure you have the following installed:</p>
  <ul>
    <li><a href="https://nodejs.org/">Node.js</a> (v22.11.0 LTS is recommended)</li>
    <li><a href="https://www.npmjs.com/">npm</a> (comes with Node.js)</li>
    <li>A text editor like <a href="https://code.visualstudio.com/">Visual Studio Code</a></li>
  </ul>

  <h2>Cloning the Repository</h2>
  <ol>
    <li><strong>Fork the repository</strong>: Click on the "Fork" button on the <a href="https://github.com/Visual1mpact/Paradox_AntiCheat">Paradox_AntiCheat GitHub page</a>.</li>
    <li><strong>Clone the repository</strong>: Clone your fork to your local machine:
      <pre><code>git clone https://github.com/&lt;your-github-username&gt;/Paradox_AntiCheat.git</code></pre>
    </li>
    <li><strong>Navigate to the Paradox_AntiCheat (root) directory</strong>:
      <pre><code>cd Paradox_AntiCheat</code></pre>
    </li>
  </ol>

  <h2>Setting Up the Development Environment</h2>
  <ol>
    <li><strong>Install Dependencies</strong>: In the Paradox_AntiCheat (root) directory, run the following command to install the necessary dependencies:
      <pre><code>npm i</code></pre>
    </li>
  </ol>

  <h2>Testing the Docs Locally with Docsify</h2>
  <p>Docsify is used to generate the documentation site. To test changes locally:</p>
  <ol>
    <li><strong>Start the Local Server</strong>: Run the following command at the root of Paradox_AntiCheat to start a local server:
      <pre><code>node server.js</code></pre>
      This will start a local development server, and you can preview the documentation at <a href="http://localhost:4000" target="_blank">http://localhost:4000</a> unless otherwise specified.
    </li>
    <li><strong>Make Changes</strong>: Edit the Markdown files in the /docs directory. You can add new content, update existing sections, or fix formatting issues.</li>
    <li><strong>Preview Your Changes</strong>: As you make changes, the local Docsify server will automatically reload the page to show your updates after you refresh the page.</li>
    <li><strong>Gracefully Stop the Server</strong>: Once you're done testing locally, you can stop the server gracefully by pressing `Ctrl + C` in the terminal where the server is running. This will terminate the server process.</li>
  </ol>

  <h2>Submitting Changes</h2>
  <ol>
    <li><strong>Commit Your Changes</strong>: Once you’re happy with your changes, commit them:
      <pre><code>git add .</code></pre>
      <pre><code>git commit -m "Description of the changes"</code></pre>
    </li>
    <li><strong>Push Your Changes</strong>: Push your changes to your forked repository:
      <pre><code>git push origin &lt;branch-name&gt;</code></pre>
    </li>
    <li><strong>Create a Pull Request</strong>: Go to the original <a href="https://github.com/Visual1mpact/Paradox_AntiCheat" target="_blank">Paradox_AntiCheat GitHub repository</a> and create a pull request with your changes. Be sure to include a clear description of what changes you’ve made.</li>
  </ol>

  <h2>Additional Notes</h2>
  <ul>
    <li><strong>Markdown Formatting</strong>: Ensure that your Markdown files are well formatted. You can use tools like <a href="https://github.com/DavidAnson/markdownlint" target="_blank">Markdownlint</a> for checking formatting.</li>
    <li><strong>Docsify Features</strong>: Refer to the <a href="https://docsify.js.org/" target="_blank">Docsify documentation</a> for more details on customizing the documentation site.</li>
  </ul>

  <p>Thank you for contributing to Paradox AntiCheat documentation!</p>

</body>
</html>
