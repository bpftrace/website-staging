# 4. Working with dynamic user probes


In this lab you will experiment with probing dynamic *u*ser probes (`uprobes`). These are locations in userland applications and libraries that are made available on-demand by the kernel uprobe subsystem. 

[The `uprobe`](https://bpftrace.org/docs/v0.21.x.html#probes-uprobe) is very similar to the kernel [kfunc/kprobe](./kernel-probes) probes that we saw previously. For example, on an x86 architecture when a `uprobe` is armed, the
kernel will dynamically replace the target address with an `INT3` (`0xCC`) instruction.
The original instruction is saved into a special part of the process address space and will later be single stepped there. Eventually if the breakpoint (`INT3`)
is hit, the `uprobe` subsystem will get notified and registered callbacks will be run.

With a uprobe, any instruction in a userland application can be traced. However, with great power comes great responsibility: for every traced instruction we must dive into the kernel to execute additional code to satisfy the required tracing scripts and this adds latency into the application being traced. While every effort is made to ensure this cost is kept to a minimum it is worth keeping this in mind when tracing latency sensitive parts of applications.

**NOTE**: This version of the lab is specific to the Scale 22x lab which is being ran on nix based systems. This means that the path to libraries will be in the nix store (i.e, paths beginning with `/nix/store`). Normally you'd expect your system libraries such as `libc` to be in more friendly looking locations :-) .

### uprobe format

The format of a uprobe is:

```txt
uprobe:<library_name>:[cpp:]<function_name>
```

The optional `:cpp` component is specific to C++ application tracing and is discussed later. An important concept with uprobes is that the probing is applied to a file (an inode to be precise) and not specifically to a process. This means that we reference paths to files when specifying a probe to be enabled (e.g. `/lib64/libc.so`) and if we want to restrict the probe to a particular process we need to use `-p` flag or a `comm` filter.

### probe discovery

To list the probe sites that are available we simply specify a path to a given library or executable. For example, all the function sites that can be probed in `libc.so`:

```sh
$ sudo bpftrace -l 'uprobe:/nix/store/nq*2.40-36/lib/libc.so*:*'
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:_Exit
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:_Fork
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:_IO_adjust_column
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:_IO_adjust_wcolumn
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:_IO_cleanup
<chop>
```

To list probes available in a running process we can simply specify a path to the `procfs` executable image for that process:

```sh
$ pgrep dhcpcd
1531
$ sudo bpftrace -l 'uprobe:/proc/1531/exe:*'
uprobe:/proc/1531/exe:MD5Final
uprobe:/proc/1531/exe:MD5Init
uprobe:/proc/1531/exe:MD5Transform
uprobe:/proc/1531/exe:MD5Update
uprobe:/proc/1531/exe:SHA256_Final
uprobe:/proc/1531/exe:SHA256_Init
uprobe:/proc/1531/exe:SHA256_Transform
uprobe:/proc/1531/exe:SHA256_Update
<chop>
```


### Hands on: watch voluntary exit codes

Run on your devserver:

```sh
$ sudo bpftrace -e 'uprobe:/nix/store/nq*2.40-36/lib/libc.so*:exit
{
    printf("%s exited with code %d\n", comm, arg0);
}'
```

For sample workload to observe simply log into your lab system again or just run a regular command such as `man ls`.

*C++ Note:* When observing C++ remember that each function is passed the `this` pointer implcitly as the first argument. This means that when dealing with C++ applications we index a function's arguments starting at arg1 and not arg0.


### Hands on: track process lifetimes

This example brings the previous two examples to the next logical step:
tracking process lifetimes. Suppose we wanted to figure out how long on
average particular processes live.

First let's find an appropriate start function to trace:

```sh
$ sudo bpftrace -l 'uprobe:/nix/store/nq*2.40-36/lib/libc.so*:*' | grep libc_start
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:__libc_start_call_main
uprobe:/nix/store/nqb2ns2d1lahnd5ncwmn6k84qfd7vx2k-glibc-2.40-36/lib/libc.so.6:__libc_start_main
```

It looks like `__libc_start_main` will work for us.

Now let's create a bpftrace script that will track in histograms how long
each process lives for:

```sh
$ cat process_lifetime.bt
uprobe:/nix/store/nq*2.40-36/lib/libc.so*:__libc_start_main
{
  @start_times[pid] = nsecs;
}

uprobe:/nix/store/nq*2.40-36/lib/libc.so*:exit
/@start_times[pid] != 0/
{
  @lifetime_hist[comm] = hist(nsecs - @start_times[pid]);
  delete(@start_times, pid);
}

END
{
  clear(@start_times);
}
```

This script records the start time in bpftrace-relative nanoseconds for each
pid. Then on process exit, we correlate the end time with the start time.
Finally, we place the data in a per-comm (or executable name) histogram.
The resulting data (in nanoseconds) should be printed to the console.

Let's see what happens when we run the script for ~30 seconds (**NOTE**: generate some activity yourself by logging in and running some random commands):
```sh
$ sudo bpftrace process_lifetime.bt
Attaching 3 probes...
^C
@lifetime_hist[dig]:
[8M, 16M)              2 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[mkdir]:
[128K, 256K)           2 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[awk]:
[512K, 1M)             1 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[1M, 2M)               0 |                                                    |
[2M, 4M)               0 |                                                    |
[4M, 8M)               0 |                                                    |
[8M, 16M)              0 |                                                    |
[16M, 32M)             1 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[find]:
[256K, 512K)           2 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[grep]:
[256K, 512K)           1 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[512K, 1M)             0 |                                                    |
[1M, 2M)               0 |                                                    |
[2M, 4M)               0 |                                                    |
[4M, 8M)               0 |                                                    |
[8M, 16M)              0 |                                                    |
[16M, 32M)             0 |                                                    |
[32M, 64M)             1 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[cut]:
[128K, 256K)           3 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|

@lifetime_hist[cat]:
[128K, 256K)           2 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[256K, 512K)           1 |@@@@@@@@@@@@@@@@@@@@@@@@@@                          |
```

Now we have some nice adhoc data on process lifetimes. We could easily customize
this script to provide more data.

This example highlights a very important aspect of user probes that can be used to great advantage: we can instrument a library or executable's binary image and we will then fire this probe for every subsequent invocation of the binary image. This provides us with an excellent facility to gain true global insights into all applications that use the instrumented image.

### Exercise 4.3

Can you make the histograms display _seconds_ instead of nanoseconds?

---

## Further Reading

* https://lwn.net/Articles/391974/
* https://lwn.net/Articles/543924/
* https://www.kernel.org/doc/html/latest/trace/uprobetracer.html

## [Back to HOL Intro](./intro)
