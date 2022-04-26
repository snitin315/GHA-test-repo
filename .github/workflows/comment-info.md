**The latest updates on your project ({{ .stageLabel }})**
<table>
  <thead>
    <tr>
      <th> App Name </th>
      <th> Build Status </th>
      <th> Build Version </th>
      <th> Build Commit </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td> {{ .appName }} </td>
      <td> {{ .buildStatus }} </td>
      <td> {{ .buildVersion }} </td>
      <td> {{ .buildCommit }} </td>
  </tbody>
</table>
