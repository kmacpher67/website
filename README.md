# website
ken macpherson public static website 



create a new host
```
ln -s /etc/nginx/sites-available/warren.fyi.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/tcpanthers.org.conf /etc/nginx/sites-enabled/
systemctl restart nginx
```


## errors: 

```
# tail /var/log/nginx/error.log
2023/08/01 14:54:44 [emerg] 26308#26308: open() "/etc/nginx/sites-enabled/tcpanthers.org.conf" failed (2: No such file or directory) in /etc/nginx/nginx.conf:62
```

Make sure you update the 
`.github/workflows/deploywebsite.yml`
```- name: copy website nginx conf file```


