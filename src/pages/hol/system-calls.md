# 2. Working with system calls

In this lab you will experiment with tracing system call interfaces. As this is the primary mechanism with which a process interacts with the kernel, it can often be of interest when investigating systemic and/or application behavior.

The number of system calls may vary from kernel to kernel and we can see which exist on our system with `bpftrace -l`:

```sh
sudo bpftrace -l 'tracepoint:syscalls:sys_enter*'
```
Example output:
```sh
tracepoint:syscalls:sys_enter_accept
tracepoint:syscalls:sys_enter_accept4
tracepoint:syscalls:sys_enter_access
tracepoint:syscalls:sys_enter_add_key
tracepoint:syscalls:sys_enter_adjtimex
...
```

You should have in excess of 300 system calls to choose from!


## Syscall probe naming format

Each syscall has two distinct probes: an **enter** probe which is fired when a system call is called and an **exit** probe which is fired on return from a system call. The format of the two different types of syscall probe are:

```sh
tracepoint:syscalls:sys_enter_<syscall_name>
tracepoint:syscalls:sys_exit_<syscall_name>
```

For example, the `open(2)` system call probes are:

```sh
tracepoint:syscalls:sys_enter_open
tracepoint:syscalls:sys_exit_open
```

### Exercise 2.1

Does `t:syscalls:sys_exit_exit` exist? If so, when will it fire?

## Syscall entry probes

The arguments for a system call probe are made available through [the 📖 `args` builtin structure](/docs/pre-release#_builtins). For example, according to the man page for `write(2)`, the syscall has 3 arguments: `int fd`, `const char * buf` and `size_t count`. We can verify that with the `-lv` options to `bpftrace`:

```sh
sudo bpftrace -lv 't:syscalls:sys_enter_write'
```
Example output:
```sh
tracepoint:syscalls:sys_enter_write
    int __syscall_nr
    unsigned int fd
    const char __attribute__((btf_type_tag("user"))) * buf
    size_t count
```

Things to note:

* We've used the abbreviated name for `tracepoint` above - simply "`t`". Every probe type has an abbreviated format.
* You can ignore the `__attribute__` tag on the `buf` parameter. This is kernel implementation detail you don't need to worry about. You may not see the attribute tag on your kernel.
* Those with a keen eye may have noted that we have an extra parameter - `int __syscall_nr`. Again, this is just an implementation detail that has been exposed to you and you'll probably have little use for it. It's the system call number assigned to this system call in the kernel (more detail in "Further Reading" - see below)

To access an argument, we reference it through [the 📖 `args` builtin](/docs/pre-release#_builtins) using its name, e.g, `args.buf`. In the following example we capture the first 32KB bytes (or less) of any buffer being sent to file descriptor 2 which is usually `stderr` (although it's obviously not guaranteed to be that).

Create a new file named `write.bt` and paste this code:
```
config = {
  max_strlen = 32768; /* 32KB - max string size */
}

/* fd 2 might not be a processes stderr but it's good fun nonetheless */
tracepoint:syscalls:sys_enter_write
/args.fd == 2/
{
        printf("%s: %s\n", comm,  str(args.buf));
}
```

```sh
sudo bpftrace ./write.bt
```
Example output:
```sh
Collection-27: D0926 06:01:22.474303 128492 SchedulerThread.cpp:144] SCHEDULABLE BEING REFIRED id=*NoisyCollectors* interval=1000000000 ns offset=783221187 ns now=@1378369044761823 ns fireTime=@1378369044696482 ns nextFireTime=1378370044761823 ns
tFireTime=1378428569540704 ns
235 ns
ns
me=1378425746961
cppdynamoserver: I0926 06:01:22.532336 834847 PowerReader.cpp:762] getPower succeeded! totalPower: 146.386, server power: 136.71

Collection-27: D0926 06:01:22.535629 128492 SchedulerThread.cpp:144] SCHEDULABLE BEING REFIRED id=fb303:fg_policy:devbig042.lla2:::1:9176 interval=60000000000 ns offset=23946121169 ns now=@1378369106087589 ns fireTime=@1378369106021796 ns nextFireTime=1378429106021796 ns
4 ns
235 ns
ns
me=1378425746961
```

The above script usually produces interesting output on a busy production system running lots of different applications and scripts.

**NOTE**: With a vanilla install then this script may produce nothing as there isn't much actually running on such a system! If that's the case for you, in another terminal execute regular commands with bogus arguments which will generate output to the terminals stderr (e.g., `'ls /unknown'`, `'man nonsense'`, `'cat flap'`, ...).

(XXXXXXX fix echo of input on lab vm!).

Things to note:

* Recent builds of bpftrace now have Big String support which supports working with strings up to 32KB in size. The default size is still 64 bytes and therefore [the 📖 `max_strlen` tunable parameter](/docs/pre-release#_max_strlen) has been tuned to 32KB in the `config` block.
* `char *`'s must be explicitly converted to strings using [the 📖 `str()` builtin](/docs/pre-release#functions-str).
* [The 📖 `comm` builtin](/docs/pre-release#_builtins) gives us the name of the thread doing the write call.

## Syscall return probes

As with any C function, we only have a single return value from a syscall. As an exercise, compare the return codes specified in the man pages with the output of `bpftrace -lv` for the following syscalls exit probes:

- `close`
- `mmap`
- `write`

As you can see, the types don't agree as bpftrace always reports the return type as 'long'. We may need to cast the return value accordingly to the correct return type as specified by the man page.

---

## Exercises

NOTE: before attempting the tasks in this section select the `syscalls` option from the `bpfhol` menu.

### Exercises 2.2: `mmap(2)`

1. Locate the process doing the most mmap calls in a 30 second period (it should be obvious :-) ).
1. What are the sizes of the segments being created?
1. Keep a count of created mappings and use that to discover the ratio of private to shared mappings (HINT: use the `MAP_SHARED` and `MAP_PRIVATE` flags).

### Exercises 2.3: `open(2)/openat(2)`

1. Write a script to show which files are being opened. (use `open(2)` only).
1. Extend that script to show which processes are opening which file. (use `open(2)` only). 
1. Change that script to only show open calls that are creating temp files (hint: use the `O_TMPFILE` flag with `openat(2)`).

### Exercises 2.4: `close(2)`

1. Find all `close(2)` system calls that were passed invalid file descriptors.

In the next section we take a dive into tracing [kernel functions](./kernel-probes).


## Further Reading

* [Adding a New System Call](https://www.kernel.org/doc/html/latest/process/adding-syscalls.html)

## [Back to HOL Intro](./intro)
